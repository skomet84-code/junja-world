import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const open=html.indexOf('<script>'),close=html.lastIndexOf('</script>');
assert.ok(open>=0&&close>open,'game script exists');
const script=html.slice(open+8,close);
new vm.Script(script,{filename:'life/index.html script'});
const start=script.indexOf('function walkable('),end=script.indexOf('// Optional LAN / server-hosted friends.');
assert.ok(start>=0&&end>start,'movement helpers exist');
const movement=script.slice(start,end);
const context=vm.createContext({});
vm.runInContext(`
const W=2000,H=1680,player={x:1050,y:955};
let path=[],goal=null,popup=null,notices=[],arrivals=[];
const els={hint:{classList:{add(){}}}};
function toast(s){notices.push(s)}
function interaction(s){arrivals.push(s)}
function openNpc(){}function openAnimal(){}
const animalFriends=[];
`+movement+`
moveTo(1058,962,{type:'action',kind:'home'});
if(arrivals[0]!=='home'||notices.length||path.length)throw Error('same-cell tap should arrive without blocked message');
moveTo(1260,1050,null);
if(path.length<2||!goal||!path.every(p=>walkable(p.x,p.y)))throw Error('tap should create walkable A* path');
`,context,{timeout:2000});
assert.match(script,/PointerEvent.*window/);
assert.match(script,/touchstart/);
assert.match(script,/lastBlockedRetry/);
assert.doesNotMatch(script,/(?:virtualJoystick|joystickCanvas)/);
console.log('JUNJA VILLAGE mobile touch, A* and script syntax checks passed');
