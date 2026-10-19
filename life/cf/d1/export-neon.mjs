// READ-ONLY Neon -> isolated D1 staging exporter.
// Never commit the resulting SQL: it includes authentication hashes and user saves.
// This utility does NOT connect to Cloudflare, deploy, write to Neon, or cut over URLs.
import pg from 'pg';
import {writeFile,chmod,rename,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';

const args=process.argv.slice(2),option=(k)=>args[args.indexOf(k)+1];
const staging=args.includes('--staging-allow-missing-saves');
const out=args.includes('--out')?option('--out'):null;
if(args.includes('--out')&&!out)throw Error('--out requires a path');
const conn=process.env.VILLAGE_DATABASE_URL || process.env.DATABASE_URL;
if(!conn)throw Error('Set VILLAGE_DATABASE_URL in your PRIVATE local shell; never paste it in chat or git');
const client=new pg.Client({connectionString:conn,ssl:{rejectUnauthorized:false}});
const tables={
 village_users:['id','username','nickname','password_salt','password_hash','role','created_at','last_login_at'],
 village_saves:['user_id','profile','owned','version','updated_at'],
 village_wallets:['user_id','balance','updated_at'],
 village_wallet_transfers:['id','sender_id','recipient_id','amount','kind','idempotency_key','created_at']
};
const quote=v=>{
 if(v===null||v===undefined)return 'NULL';
 if(v instanceof Date)return "'"+v.toISOString()+"'";
 if(typeof v==='object')return quote(JSON.stringify(v));
 if(typeof v==='number'&&!Number.isFinite(v))throw Error('Invalid number');
 return "'"+String(v).replaceAll("'","''")+"'";
};
const numeric=(v,kind)=>{
 if(!/^(0|[1-9][0-9]*)$/.test(String(v)))throw Error('Invalid '+kind);
 if(BigInt(v)>9223372036854775807n)throw Error(kind+' exceeds SQLite int64');
 return String(v);
};
const encode=(name,row)=>{
 const keys=tables[name];
 const values=keys.map(k=>{
  const v=row[k];
  if(v===undefined)throw Error('Missing '+name+'.'+k);
  if(['balance','amount','version'].includes(k))return numeric(v,k);
  return quote(v);
 });
 return 'INSERT INTO '+name+'('+keys.join(',')+') VALUES ('+values.join(',')+');';
};
const fingerprint=data=>createHash('sha256').update(JSON.stringify(data,(k,v)=>typeof v==='bigint'?v.toString():v)).digest('hex');
let exportedSql=null;
try{
 await client.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const batches={},counts={};
 for(const [name,columns] of Object.entries(tables)){
  const r=await client.query('SELECT '+columns.join(',')+' FROM '+name+' ORDER BY '+columns[0]);
  batches[name]=r.rows;
  counts[name]=r.rows.length;
 }
 // Do NOT turn missing cloud saves into brand-new profiles silently.
 const saved=new Set(batches.village_saves.map(r=>r.user_id));
 const unsaved=batches.village_users.filter(r=>!saved.has(r.id)).length;
 const extraTables=await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('village_economy_v36_accounts','village_economy_v36_events','village_economy_v37_checkpoints','village_market_v38_listings','village_market_v38_requests')");
 const found=extraTables.rows.map(r=>r.table_name);
 await client.query('COMMIT');
 console.log(JSON.stringify({mode:'read-only-audit',counts,accounts_missing_cloud_save:unsaved,
  found_trial_economy_tables:found,standard_trial_economy_tables:5},null,2));
 if(unsaved>0&&!staging){
  throw Error('STOP: '+unsaved+' accounts have no server save. Investigate old clients/backups first. Only isolated test exports may use --staging-allow-missing-saves.');
 }
 if(found.length>0){
  throw Error('STOP: trial economy records exist and need a separate lossless export. Do not silently omit trial money.');
 }
 if(!out){console.log('Audit only. No export file created, no source changes.');process.exitCode=0;}
 else{
  const target=resolve(out),tmp=target+'.tmp-'+randomUUID();
  const lines=[
   '-- PRIVATE DATA: Do not commit, share, or log. Import ONLY to an EMPTY D1 staging database.',
   '-- All users retain original UUID, password salt/hash, profile XP, owned items and save version.',
   '-- Login sessions are intentionally excluded: users must sign in again after cutover.',
   '-- Do NOT import into the live server without a verified freeze/delta plan.'
  ];
  for(const [table,rows] of Object.entries(batches)){
   for(const row of rows)lines.push(encode(table,row));
  }
  exportedSql=lines.join('\n')+'\n';
  try{
   await writeFile(tmp,exportedSql,{mode:0o600,flag:'wx'});
   await chmod(tmp,0o600);
   await rename(tmp,target);
  }catch(e){await unlink(tmp).catch(()=>{});throw e}
  console.log(JSON.stringify({output:target,records:counts,total_inserts: Object.values(counts).reduce((a,b)=>a+b,0),
   content_checksum_sha256:createHash('sha256').update(exportedSql).digest('hex'),
   no_sessions_exported:true,isolated_staging_only:true},null,2));
 }
}catch(error){
 try{await client.query('ROLLBACK')}catch{}
 console.error(error.message);
 process.exitCode=1;
}finally{await client.end().catch(()=>{})}
