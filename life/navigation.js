/* World-space navigation: exact endpoints, swept collision and distance-based steps. */
(function(root){
'use strict';
function navigator({width,height,walkable,cell=32}){
 const cols=Math.ceil(width/cell),rows=Math.ceil(height/cell);
 const point=(i)=>({x:(i%cols+.5)*cell,y:(Math.floor(i/cols)+.5)*cell});
 const index=(p)=>Math.floor(p.y/cell)*cols+Math.floor(p.x/cell);
 function clear(a,b,margin=0){const d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(d/6));for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(!walkable(x,y)||margin&&(!walkable(x-margin,y-margin)||!walkable(x+margin,y-margin)||!walkable(x-margin,y+margin)||!walkable(x+margin,y+margin)))return false}return true}
 const safeClear=(a,b)=>clear(a,b,8);
 // Use avatar-width clearance at BOTH endpoints; a valid ground pixel may still
 // put the character's shoulder inside a wall or tree collision circle.
 const safe=(p)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&safeClear(p,p);
 function nearest(p,radius=256){
  if(safe(p))return {x:p.x,y:p.y};
  for(let r=8;r<=radius;r+=8){
   let best=null,bestDistance=Infinity;
   for(let k=0;k<32;k++){
    const a=k*Math.PI/16,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};
    if(!safe(q))continue;
    const error=Math.hypot(q.x-p.x,q.y-p.y);
    if(error<bestDistance){best=q;bestDistance=error}
   }
   if(best)return best;
  }
  return null;
 }
 // Fallback: travel along a clear portion of the tapped direction rather than
 // refusing all input because a building, shore or cliff overlaps the target.
 function approach(from,to){
  const d=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.ceil(d/6);
  if(!steps||!safe(from))return [];
  let last=from;
  for(let i=1;i<=steps;i++){
   const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};
   if(!safeClear(last,p))break;
   last=p;
  }
  return Math.hypot(last.x-from.x,last.y-from.y)>12?[last]:[];
 }
 function route(from,to){
  if(!safe(from))return [];
  const target=nearest(to);
  if(!target)return approach(from,to);
  if(Math.hypot(target.x-from.x,target.y-from.y)<.2)return [];
  if(safeClear(from,target))return [target];
  let starts=[];const fx=Math.floor(from.x/cell),fy=Math.floor(from.y/cell);
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const x=fx+dx,y=fy+dy;
   if(x>=0&&y>=0&&x<cols&&y<rows){
    const k=x+y*cols,p=point(k);
    if(safeClear(from,p))starts.push(k)
   }
  }
  if(!starts.length)return approach(from,target);
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
  if(end===null)return approach(from,target);
  const raw=[target];for(let k=end;k!==-1;k=parent.get(k)){if(k===undefined)return [];raw.unshift(point(k))}
  const smooth=[];let anchor=from,i=0;while(i<raw.length){let j=i;while(j+1<raw.length&&safeClear(anchor,raw[j+1]))j++;smooth.push(raw[j]);anchor=raw[j];i=j+1}return smooth;
 }
 function advance(actor,path,dt,speed=205){
  actor.blocked=false;let budget=speed*Math.max(0,Math.min(.05,dt)),distance=0;actor.vx=actor.vy=0;
  while(path.length&&budget>0){const p=path[0],dx=p.x-actor.x,dy=p.y-actor.y,d=Math.hypot(dx,dy);if(d<.001){actor.x=p.x;actor.y=p.y;path.shift();continue}
   const step=Math.min(d,budget),nx=actor.x+dx/d*step,ny=actor.y+dy/d*step;if(!clear(actor,{x:nx,y:ny})){actor.blocked=true;path.length=0;break}
   actor.x=nx;actor.y=ny;actor.vx=dx/d*speed;actor.vy=dy/d*speed;actor.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);distance+=step;budget-=step;
   if(step>=d-.000001){actor.x=p.x;actor.y=p.y;path.shift()}
  }
  if(!path.length)actor.vx=actor.vy=0;actor.stride=(actor.stride||0)+distance/70*Math.PI*2;return distance;
 }
 return {route,clear,nearest,safe,approach,advance};
}
root.JunjaNavigation=navigator;
})(typeof module==='object'?module.exports:globalThis);
