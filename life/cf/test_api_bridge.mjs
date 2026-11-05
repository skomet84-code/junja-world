import assert from 'node:assert/strict';
import {bridgeApi} from './api-bridge.js';
const root='https://junja-world.example';
const token='a'.repeat(64);
let calls=0;
const fake=async req=>{calls++;assert.equal(new URL(req.url).origin,'https://junja-village-friends.vercel.app');assert.equal(req.headers.get('cookie'),'village_session='+token);assert.equal(req.headers.get('authorization'),null);return new Response('{"ok":true}',{status:200,headers:{'set-cookie':'village_session='+token+'; Domain=junja-village-friends.vercel.app; Path=/; HttpOnly; Secure; SameSite=Lax'}})};
let r=await bridgeApi(new Request(root+'/api/account?action=me',{headers:{cookie:'other=secret; village_session='+token,authorization:'secret'}}),fake);
assert.equal(r.status,200);assert(!r.headers.get('set-cookie').includes('Domain='));assert(r.headers.get('set-cookie').includes('HttpOnly'));
for(const [path,init,status] of [
 ['/api/account.js',{},404],['/api/evil',{},404],
 ['/api/account',{method:'DELETE'},405],
 ['/api/account',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'},403],
 ['/api/account',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'},415],
 ['/api/account',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'},400],
 ['/api/account',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(262145)},413]
])assert.equal((await bridgeApi(new Request(root+path,init),fake)).status,status);
assert.equal(calls,1);
let mutations=0;
r=await bridgeApi(new Request(root+'/api/account?action=save',{method:'POST',headers:{origin:root,'content-type':'application/json'},body:JSON.stringify({version:8,profile:{xp:12800}})}),async req=>{mutations++;assert.equal((await req.json()).version,8);return Response.json({reason:'version_conflict'},{status:409})});
assert.equal(r.status,409);assert.equal((await r.json()).reason,'version_conflict');assert.equal(mutations,1);
assert.equal((await bridgeApi(new Request(root+'/api/account'),async()=>{throw Error('offline')})).status,503);
assert.equal((await bridgeApi(new Request(root+'/api/account'),async()=>new Response(null,{status:302,headers:{location:'https://evil.example'}}))).status,502);
console.log('PASS: session cookie, credential isolation, save conflict, CSRF, body limits, failures, no retry/redirect');
