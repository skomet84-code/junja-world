import pg from 'pg';
import {createHash} from 'node:crypto';
const pool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
const hash=s=>createHash('sha256').update(s).digest('hex');
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)return res.status(503).json({error:'DB unavailable'});
 if(!['GET','POST'].includes(req.method))return res.status(405).end();
 if(req.method==='POST'){const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return res.status(403).end();}
 const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('village_session='))?.slice(16);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return res.status(401).json({error:'login required'});
 let db;
 try{
 db=await pool.connect();
 const q=await db.query("SELECT u.id,u.nickname FROM village_sessions s JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",[hash(token)]);
 const user=q.rows[0];if(!user)return res.status(401).json({error:'session expired'});
 const room=String(req.method==='GET'?req.query.room:req.body?.room||'SPRING').replace(/[^A-Z0-9_-]/g,'').slice(0,12)||'SPRING';
 if(req.method==='POST'){
 const b=req.body||{};const x=Number(b.x),y=Number(b.y);
 if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>100000||Math.abs(y)>100000)return res.status(400).json({error:'invalid position'});
 const fashion=b.fashion&&typeof b.fashion==='object'&&!Array.isArray(b.fashion)?JSON.stringify(b.fashion).slice(0,4000):'{}';
 await db.query(`INSERT INTO village_live_peers(client_id,room,nick,x,y,dir,coat,hat,fashion,phrase,phrase_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,CASE WHEN $10 IS NULL THEN NULL ELSE now() END,now()) ON CONFLICT(client_id) DO UPDATE SET room=excluded.room,nick=excluded.nick,x=excluded.x,y=excluded.y,dir=excluded.dir,coat=excluded.coat,hat=excluded.hat,fashion=excluded.fashion,phrase=COALESCE(excluded.phrase,village_live_peers.phrase),phrase_at=CASE WHEN excluded.phrase IS NULL THEN village_live_peers.phrase_at ELSE now() END,updated_at=now()`,[user.id,room,user.nickname,x,y,String(b.dir||'down').slice(0,12),String(b.coat||'').slice(0,60),String(b.hat||'').slice(0,60),fashion,typeof b.phrase==='string'?b.phrase.slice(0,80):null]);
 }
 const peers=await db.query("SELECT client_id AS id,nick,x,y,dir,coat,hat,fashion,phrase,EXTRACT(EPOCH FROM phrase_at)*1000 AS phrase_at FROM village_live_peers WHERE room=$1 AND updated_at>now()-interval '12 seconds' ORDER BY updated_at DESC LIMIT 32",[room]);
 return res.status(200).json({id:user.id,players:peers.rows.filter(p=>p.id!==user.id)});
 }catch(e){console.error('live peers',e);return res.status(500).json({error:'presence failed'})}finally{db?.release()}
}