import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app=express();
const publicPort=Number(process.env.PORT||10000);
const backendPort=publicPort===10001?10002:10001;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let backendReady=false;
let backendError='starting';

app.disable('x-powered-by');

app.get('/api/health',(_req,res)=>{
  res.status(200).json({
    ok:true,
    game:'JUNJA WORLD',
    version:'2.9.2',
    frontdoor:true,
    backendReady,
    backendError:backendReady?null:backendError
  });
});

app.use('/api',(req,res)=>{
  if(!backendReady){
    return res.status(503).json({error:'게임 서버가 준비 중입니다. 화면은 정상 접속되며 잠시 후 다시 시도해주세요.',backendReady:false});
  }
  const proxy=http.request({
    hostname:'127.0.0.1',
    port:backendPort,
    path:req.originalUrl,
    method:req.method,
    headers:{...req.headers,connection:'close'}
  },upstream=>{
    res.statusCode=upstream.statusCode||502;
    for(const [key,value] of Object.entries(upstream.headers)){
      if(value!==undefined)res.setHeader(key,value);
    }
    upstream.pipe(res);
  });
  proxy.on('error',error=>{
    console.error('[FRONTDOOR] API proxy error:',error?.message||error);
    if(!res.headersSent)res.status(503).json({error:'게임 서버 연결이 지연되고 있습니다.',backendReady:false});
    else res.end();
  });
  req.pipe(proxy);
});

app.use(express.static(path.join(root,'dist'),{maxAge:'0',etag:false,setHeaders:res=>res.setHeader('Cache-Control','no-store')}));
app.get('/{*splat}',(_req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.sendFile(path.join(root,'dist','index.html'));
});

app.listen(publicPort,'0.0.0.0',()=>{
  console.log(`[FRONTDOOR] JUNJA WORLD public server listening immediately on 0.0.0.0:${publicPort}`);
  startBackend();
});

async function startBackend(){
  try{
    process.env.PORT=String(backendPort);
    await import('./index.mjs');
    backendReady=true;
    backendError='';
    console.log(`[FRONTDOOR] Full game backend ready on internal port ${backendPort}`);
  }catch(error){
    backendReady=false;
    backendError=String(error?.message||error).slice(0,300);
    console.error('[FRONTDOOR] Full backend failed; keeping public site online:',error?.stack||error);
  }
}
