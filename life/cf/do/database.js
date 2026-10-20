// Single-platform Cloudflare SQLite Durable Object.
// Worker -> this DO only: no external SQL, Vercel or account API upstream.
import {DurableObject} from 'cloudflare:workers';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {handleAccountD1,userForSession} from '../d1/account-staging.js';
import {handleAccountExtras} from '../d1/account-extensions.js';
import {handleTrialEconomyD1} from '../d1/economy-staging.js';

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
  this.db=createSqliteAdapter(ctx);
 }
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/internal/health'){
   const row=await this.db.prepare('SELECT count(*) AS n FROM village_users').first();
   return json({ok:true,database:'cloudflare-do-sqlite',users:Number(row?.n||0),release:'v50-single-platform'});
  }
  if(url.pathname==='/internal/ws-auth'){
   const user=await userForSession(request,this.db);
   return user?json({ok:true,nickname:user.nickname,username:user.username}):json({error:'로그인이 필요해요'},401);
  }
  if(url.pathname==='/api/account')return handleAccountD1(request,{...this.env,DB:this.db});
  if(url.pathname==='/api/economy-v36')return handleTrialEconomyD1(request,{DB:this.db},'v36');
  if(url.pathname==='/api/economy-v37')return handleTrialEconomyD1(request,{DB:this.db},'v37');
  return json({error:'지원하지 않는 API'},404);
 }
}
