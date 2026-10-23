// Transitional bridge: authoritative accounts and saves remain on the existing API/DB.
const ORIGIN = 'https://junja-village-friends.vercel.app';
const ROUTES = new Set(['account','economy-v36','economy-v37','market-v38','professions-v39','business-v40','workshop-visits-v41','resident-demand-v44','customer-loyalty-v45','business-honors-v46','share-image']);
const fail=(status,reason)=>Response.json({error:'서버 연결을 확인해 주세요. 저장 기록은 변경하지 않았어요.',reason},{status,headers:{'cache-control':'no-store'}});
export async function bridgeApi(request, fetcher=fetch){
 const url=new URL(request.url);
 if(!ROUTES.has(url.pathname.slice(5)))return fail(404,'unknown_api');
 if(!['GET','POST','HEAD'].includes(request.method))return fail(405,'method_not_allowed');
 if(request.method==='POST'){
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'cross_origin_request');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return fail(415,'json_required');
 }
 const headers=new Headers({accept:request.headers.get('accept')||'application/json'});
 const session=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>/^village_session=[a-f0-9]{64}$/.test(s));
 if(session)headers.set('cookie',session);
 let body;
 if(request.method==='POST'){
  if(Number(request.headers.get('content-length'))>262144)return fail(413,'body_too_large');
  const reader=request.body?.getReader();const chunks=[];let length=0;
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>262144){await reader.cancel();return fail(413,'body_too_large')}chunks.push(value)}
  body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}
  try{JSON.parse(new TextDecoder().decode(body))}catch{return fail(400,'invalid_json')}
  headers.set('content-type','application/json');
 }
 try{
  const response=await fetcher(new Request(ORIGIN+url.pathname+url.search,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(15000)}));
  // Never forward credentials to redirects or retry a mutation whose outcome is unknown.
  if(response.status>=300&&response.status<400)return fail(502,'upstream_redirect');
  const out=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff'});
  for(const name of ['content-type','retry-after'])if(response.headers.has(name))out.set(name,response.headers.get(name));
  for(const cookie of response.headers.getSetCookie()){
   if(/^village_session=/.test(cookie))out.append('set-cookie',cookie.replace(/;\s*Domain=[^;]*/ig,''));
  }
  return new Response(response.body,{status:response.status,headers:out});
 }catch{return fail(503,'upstream_unavailable')}
}
