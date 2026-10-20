// Single-platform Cloudflare SQLite Durable Object.
// Worker -> this DO only: no external SQL, Vercel or account API upstream.
import {DurableObject} from 'cloudflare:workers';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {ensureOwnerPromotion,OWNER_GRANT_MARKER} from './owner-promotion.js';
import {handleAccountD1,userForSession} from '../d1/account-staging.js';
import {handleAccountExtras} from '../d1/account-extensions.js';
import {handleTrialEconomyD1} from '../d1/economy-staging.js';
import {handleMarketV51} from './market-v51.js';
import {handleProfessionsV51} from './professions-v51.js';
import {handleBusinessV51} from './business-v51.js';
import {handleQuestsV51,installV51QuestSchema} from './quests-v51.js';

// The D1-style shim deliberately implements only the methods used by the
// staging handlers, running against Cloudflare's synchronous SQLite storage.
// batch() is transactionSync: all statements commit or roll back as ONE unit.
export function createSqliteAdapter(ctx){
 const sqlite=ctx.storage.sql;
 const prepared=(query,args=[])=>({
  bind(...params){return prepared(query,params)},
  _execute(){
   const cursor=sqlite.exec(query,...args);
   // SQLite changes() counts table rows changed, not indexes written.
   const change=sqlite.exec('SELECT changes() AS n').one()?.n||0;
   return {cursor,meta:{changes:Number(change)}};
  },
  async first(){return sqlite.exec(query,...args).toArray()[0]||null},
  async all(){return {results:sqlite.exec(query,...args).toArray()}},
  async run(){const out=this._execute();return {meta:out.meta}},
 });
 return {
  prepare:(sql)=>prepared(sql),
  async batch(stmts){
   return ctx.storage.transactionSync(()=>stmts.map(s=>{
    const result=s._execute();
    return {meta:result.meta,results:result.cursor.toArray()};
   }));
  }
 };
}
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export class VillageDatabase extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  // CREATE IF NOT EXISTS does not change existing records. Initialization is
  // idempotent, and there is no importer of legacy users or browser saves.
  const sql=ctx.storage.sql;
  sql.exec(CORE_SQL);
  sql.exec(ECONOMY_SQL);
  installV51QuestSchema(sql);
  // This one-time opening marker lives inside the same durable SQLite database.
  // Subsequent deployments MUST NOT repeat the opening reset.
  sql.exec(`CREATE TABLE IF NOT EXISTS village_release_flags (
   id TEXT PRIMARY KEY NOT NULL,
   applied_at TEXT NOT NULL,
   deleted_users INTEGER NOT NULL CHECK(deleted_users>=0)
  )`);
  this.db=createSqliteAdapter(ctx);
 }
 ensureFreshOpening(){
  const sql=this.ctx.storage.sql,marker='v50-fresh-opening-2026-10-20';
  const old=sql.exec('SELECT id FROM village_release_flags WHERE id=?',marker).toArray()[0];
  if(old)return;
  // User explicitly authorized clearing all Cloudflare game characters and
  // registrations for the official new opening. Neon/Vercel are untouched.
  // The delete order respects every foreign key (including experimental economy).
  // This whole operation is atomic. If anything fails it rolls back instead
  // of partially deleting accounts or breaking registration.
  this.ctx.storage.transactionSync(()=>{
   const already=sql.exec('SELECT id FROM village_release_flags WHERE id=?',marker).toArray()[0];
   if(already)return;
   const before=Number(sql.exec('SELECT count(*) AS n FROM village_users').one().n||0);
   for(const name of [
    'village_market_v38_requests','village_market_v38_listings',
    'village_economy_v37_checkpoints','village_economy_v36_events',
    'village_economy_v36_accounts',
    'village_wallet_transfers','village_wallets','village_sessions',
    'village_presence','village_saves','village_live_peers',
    'village_auth_limits','village_users'
   ])sql.exec('DELETE FROM '+name);
   sql.exec('INSERT INTO village_release_flags(id,applied_at,deleted_users) VALUES(?,?,?)',
    marker,new Date().toISOString(),before);
  });
 }
 async fetch(request){
  this.ensureFreshOpening();
  // Only existing registered account 'skomet'/'준자준비' can receive this
  // pre-authorized, one-time grant. Absence/mismatch permanently locks the
  // attempt instead of granting future registration a surprise privilege.
  const ownerGrant=ensureOwnerPromotion(this.ctx.storage);
  const url=new URL(request.url);
  if(url.pathname==='/internal/health'){
   const row=await this.db.prepare('SELECT count(*) AS n FROM village_users').first();
   const reset=await this.db.prepare('SELECT applied_at,deleted_users FROM village_release_flags WHERE id=?').bind('v50-fresh-opening-2026-10-20').first();
   return json({ok:true,database:'cloudflare-do-sqlite',users:Number(row?.n||0),release:'v54.1-energy-recovery',
    freshOpening:!!reset,resetPreviousUsers:Number(reset?.deleted_users||0),
    ownerGrant:ownerGrant==='granted'||ownerGrant==='already_admin'?'granted':ownerGrant});
  }
  if(url.pathname==='/internal/ws-auth'){
   const user=await userForSession(request,this.db);
   return user?json({ok:true,nickname:user.nickname,username:user.username}):json({error:'로그인이 필요해요'},401);
  }
  if(url.pathname==='/api/account')return handleAccountD1(request,{...this.env,DB:this.db});
  if(url.pathname==='/api/economy-v36')return handleTrialEconomyD1(request,{DB:this.db},'v36');
  if(url.pathname==='/api/economy-v37')return handleTrialEconomyD1(request,{DB:this.db},'v37');
  if(url.pathname==='/api/market-v38')return handleMarketV51(request,this.ctx.storage,this.db);
  if(url.pathname==='/api/professions-v39')return handleProfessionsV51(request,this.ctx.storage,this.db);
  if(url.pathname==='/api/business-v40')return handleBusinessV51(request,this.ctx.storage,this.db);
  if(url.pathname==='/api/quests-v51')return handleQuestsV51(request,this.ctx.storage,this.db);
  return json({error:'지원하지 않는 API'},404);
 }
}
