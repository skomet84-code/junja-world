/* World-space navigation: exact endpoints, swept collision and distance-based steps. */
(function(root){
'use strict';
function navigator({width,height,walkable,cell=32}){
 const cols=Math.ceil(width/cell),rows=Math.ceil(height/cell);
 const point=(i)=>({x:(i%cols+.5)*cell,y:(Math.floor(i/cols)+.5)*cell});
 const index=(p)=>Math.floor(p.y/cell)*cols+Math.floor(p.x/cell);
 function clear(a,b,margin=0){const d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(d/6));for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(!walkable(x,y)||margin&&(!walkable(x-margin,y-margin)||!walkable(x+margin,y-margin)||!walkable(x-margin,y+margin)||!walkable(x+margin,y+margin)))return false}return true}
 function nearest(p){if(walkable(p.x,p.y))return {...p};for(let r=8;r<=192;r+=8){let best=null;for(let k=0;k<40;k++){const a=k*Math.PI/20,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(walkable(q.x,q.y))best=q;}if(best)return best}return null}
 const safeClear=(a,b)=>clear(a,b,8);
 function route(from,to){
  const target=nearest(to);if(!target)return [];if(safeClear(from,target))return [target];
  let starts=[];const fx=Math.floor(from.x/cell),fy=Math.floor(from.y/cell);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=fx+dx,y=fy+dy;if(x>=0&&y>=0&&x<cols&&y<rows){const k=x+y*cols,p=point(k);if(safeClear(from,p))starts.push(k)}}
  const heap=[],cost=new Map(),parent=new Map(),closed=new Set();
  function push(v){heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=v.f)break;heap[i]=heap[p];i=p}heap[i]=v}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=last.f)break;heap[i]=heap[j];i=j}heap[i]=last}return first}
  const h=p=>Math.hypot(p.x-target.x,p.y-target.y);
  for(const k of starts){const p=point(k),g=Math.hypot(p.x-from.x,p.y-from.y);cost.set(k,g);parent.set(k,-1);push({k,f:g+h(p)})}
  let end=null;
  while(heap.length&&closed.size<cols*rows){const {k}=pop();if(closed.has(k))continue;closed.add(k);const p=point(k);
   if(h(p)<cell*2&&safeClear(p,target)){end=k;break}
   const x=k%cols,y=Math.floor(k/cols);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=cols||yy>=rows)continue;const kk=xx+yy*cols,q=point(kk);if(closed.has(kk)||!safeClear(p,q))continue;
    const g=cost.get(k)+Math.hypot(dx,dy)*cell;if(g>=(cost.get(kk)??Infinity))continue;cost.set(kk,g);parent.set(kk,k);push({k:kk,f:g+h(q)});
   }
  }
  if(end===null)return [];
  const raw=[target];for(let k=end;k!==-1;k=parent.get(k)){if(k===undefined)return [];raw.unshift(point(k))}
  const smooth=[];let anchor=from,i=0;while(i<raw.length){let j=i;while(j+1<raw.length&&safeClear(anchor,raw[j+1]))j++;smooth.push(raw[j]);anchor=raw[j];i=j+1}return smooth;
 }
 function advance(actor,path,dt,speed=190){
  actor.blocked=false;let budget=speed*Math.max(0,Math.min(.05,dt)),distance=0;actor.vx=actor.vy=0;
  while(path.length&&budget>0){const p=path[0],dx=p.x-actor.x,dy=p.y-actor.y,d=Math.hypot(dx,dy);if(d<.001){actor.x=p.x;actor.y=p.y;path.shift();continue}
   const step=Math.min(d,budget),nx=actor.x+dx/d*step,ny=actor.y+dy/d*step;if(!clear(actor,{x:nx,y:ny})){actor.blocked=true;path.length=0;break}
   actor.x=nx;actor.y=ny;actor.vx=dx/d*speed;actor.vy=dy/d*speed;actor.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);distance+=step;budget-=step;
   if(step>=d-.000001){actor.x=p.x;actor.y=p.y;path.shift()}
  }
  if(!path.length)actor.vx=actor.vy=0;actor.stride=(actor.stride||0)+distance/70*Math.PI*2;return distance;
 }
 return {route,clear,nearest,advance};
}
root.JunjaNavigation=navigator;
})(typeof module==='object'?module.exports:globalThis);
