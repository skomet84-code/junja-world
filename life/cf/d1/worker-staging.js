// Separate Cloudflare D1 migration staging Worker. Never deploy over junja-world.
// All unsupported API paths fail closed, with no fallback to guest/local saves.
import {VillageRoom} from '../worker.js';
import {handleAccountD1} from './account-staging.js';
export {VillageRoom};
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/health'||url.pathname==='/api/health'){
   if(!env.DB)return json({ok:false,release:'v50-d1-staging',error:'D1 binding missing'},503);
   try{
    await env.DB.prepare('SELECT 1 AS ready').first();
    return json({ok:true,release:'v50-d1-staging',database:'D1',production:false});
   }catch{return json({ok:false,release:'v50-d1-staging',error:'D1 check failed'},503)}
  }
  if(url.pathname==='/api/account')return handleAccountD1(request,env);
  if(url.pathname==='/api/ws'){
   const id=env.VILLAGE_ROOMS.idFromName('village-d1-staging-room-v50');
   return env.VILLAGE_ROOMS.get(id).fetch(request);
  }
  if(url.pathname.startsWith('/api/'))return json({error:'별도 D1 시험 서버입니다. 경제 API는 아직 검증 중입니다.',reason:'staging_only'},503);
  const file=url.pathname==='/'?'/index.html':url.pathname;
  return env.ASSETS.fetch(new Request(new URL(file,request.url),request));
 }
};
