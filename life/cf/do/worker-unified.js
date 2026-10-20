// Cloudflare-only v50 Worker: static game + SQLite account DB + live rooms.
// No calls to Vercel, Neon, Cloudflare D1 or any other app server.
import {VillageRoom} from '../d1/rooms.js';
import {VillageDatabase} from './database.js';
export {VillageRoom,VillageDatabase};
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const store=env.VILLAGE_DB.get(env.VILLAGE_DB.idFromName('v50-primary-single-platform'));
  if(url.pathname==='/health'||url.pathname==='/api/health'){
   try{
    const health=await store.fetch(new Request(new URL('/internal/health',url),{method:'GET'}));
    if(!health.ok)return json({ok:false,database:'unavailable',release:'v50-single-platform'},503);
    const result=await health.json();
    return json({ok:true,edge:'cloudflare',database:result.database,release:'v50-single-platform',accountApi:'direct',multiplayer:'durable-objects',freshOpening:result.freshOpening,registeredUsers:result.users,resetPreviousUsers:result.resetPreviousUsers,ownerGrant:result.ownerGrant||'not_configured'});
   }catch(err){console.error('DB health check failed',err?.name);return json({ok:false,release:'v50-single-platform'},503)}
  }
  const directApi=['/api/account','/api/economy-v36','/api/economy-v37','/api/market-v38','/api/professions-v39','/api/business-v40','/api/quests-v51'];
  if(directApi.includes(url.pathname))return store.fetch(request);
  if(url.pathname==='/api/ws'){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')
    return json({error:'WebSocket 연결 요청만 지원해요'},426);
   if(request.headers.get('origin')!==url.origin)
    return json({error:'다른 사이트에서 게임 연결을 할 수 없어요'},403);
   const verify=await store.fetch(new Request(new URL('/internal/ws-auth',url),{
    method:'GET',headers:{cookie:request.headers.get('cookie')||''}
   }));
   if(!verify.ok)return json({error:'먼저 게임 계정으로 로그인해 주세요'},401);
   const auth=await verify.json();
   const headers=new Headers(request.headers);
   headers.set('x-village-verified-nick',auth.nickname);
   const verified=new Request(request,{headers});
   const room=env.VILLAGE_ROOMS.get(env.VILLAGE_ROOMS.idFromName('v50-fresh-opening-rooms'));
   return room.fetch(verified);
  }
  if(url.pathname.startsWith('/api/')){
   // Experimental endpoints are NOT routed back to Neon/Vercel.
   return json({error:'통합 서버에서 이 기능을 준비하고 있어요',reason:'not_implemented'},503);
  }
  const path=url.pathname==='/'?'/index.html':url.pathname;
  const asset=await env.ASSETS.fetch(new Request(new URL(path,url),request));
  // Keep the landing page and account controls fresh after emergency fixes,
  // especially in iOS Safari / embedded Kakao webviews with long-lived caches.
  if(asset.ok&&(path==='/index.html'||path==='/account-ui.js'||path==='/admin-panel.js')){
   const headers=new Headers(asset.headers);
   headers.set('cache-control','no-store, max-age=0');
   return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
  }
  return asset;
 }
};
