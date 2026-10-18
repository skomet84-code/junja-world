// v41 public business visits: READ-ONLY, authenticated, never returns money, inventory,
// session tokens or character saves; cannot perform another resident's actions.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {visitorWorkshops} from '../workshop-plots-v41.js';
const productionPool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
const send=(res,status,data)=>res.status(status).json(data);
function token(req){return (req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('village_session='))?.slice(16)||''}
export function makeWorkshopVisitsHandler({pool=productionPool}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return send(res,405,{error:'다른 주민의 사업장은 보기만 할 수 있어요'});
  if(process.env.ENABLE_VILLAGE_WORKSHOPS_V41!=='true')
   return send(res,503,{error:'사업장 방문 기능은 아직 시험 중이에요'});
  if(pool===productionPool&&!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)
   return send(res,503,{error:'서버 연결을 확인해 주세요'});
  const raw=token(req);
  if(!/^[a-f0-9]{64}$/.test(raw))return send(res,401,{error:'준자마을 로그인 후 이용할 수 있어요'});
  let client=null;
  try{
   client=await pool.connect();
   const auth=await client.query(`SELECT u.id FROM village_sessions s JOIN village_users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now()`,[createHash('sha256').update(raw).digest('hex')]);
   if(!auth.rows.length)return send(res,401,{error:'세션이 만료됐어요'});
   const query=new URL(req.url||'/api/workshop-visits-v41','https://placeholder.invalid').searchParams;
   const owner=typeof req.query?.owner==='string'?req.query.owner:query.get('owner');
   if(owner){
    if(owner.length>128||!owner.trim())return send(res,400,{error:'방문 주민 정보를 확인해 주세요'});
    const q=await client.query(`SELECT a.state,COALESCE(u.nickname,'마을 주민') AS nickname
      FROM village_economy_v36_accounts a JOIN village_users u ON u.id::text=a.user_key
      WHERE a.user_key=$1 AND a.state ? 'workshops'`,[owner]);
    if(!q.rows.length)return send(res,404,{error:'찾을 수 없는 주민 사업장이에요'});
    const view=visitorWorkshops(q.rows[0].state);
    if(!view.ok)return send(res,409,{error:'방문할 사업장의 위치 기록을 검증해야 해요'});
    // A nonowner never receives the state, wallet, stock, serials, private profession data or receipts.
    return send(res,200,{ok:true,readOnly:true,owner,ownerName:String(q.rows[0].nickname).slice(0,32),buildings:view.buildings});
   }
   const list=await client.query(`SELECT a.user_key AS owner,COALESCE(u.nickname,'마을 주민') AS nickname,a.state
     FROM village_economy_v36_accounts a JOIN village_users u ON u.id::text=a.user_key
     WHERE a.state ? 'workshops' AND a.state->'workshops' <> '{}'::jsonb
     ORDER BY a.updated_at DESC LIMIT 30`);
   return send(res,200,{ok:true,readOnly:true,visitable:list.rows.map(row=>{
    const view=visitorWorkshops(row.state);
    return {owner:row.owner,ownerName:String(row.nickname).slice(0,32),workshopCount:view.buildings.length};
   }).filter(v=>v.workshopCount>0)});
  }catch(error){
   if(error.code==='42P01')return send(res,503,{error:'방문할 시험 사업장 데이터가 준비되지 않았어요'});
   console.error('v41 visitors',error.code||'',error.message);
   return send(res,500,{error:'방문할 사업장 목록을 불러오지 못했습니다'});
  }finally{client?.release()}
 };
}
export default makeWorkshopVisitsHandler();
