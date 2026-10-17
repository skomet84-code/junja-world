// Screen-space forgiveness for touch targets. Unit: CSS pixels.
export function nearestTapTarget(x,y,candidates,{width,height}={}){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 let best=null,score=Infinity;
 for(const c of candidates){
  if(!c||!c.pick||!Number.isFinite(c.x)||!Number.isFinite(c.y)||!Number.isFinite(c.radius)||c.radius<=0)continue;
  if(Number.isFinite(width)&&(c.x < -c.radius||c.x > width+c.radius))continue;
  if(Number.isFinite(height)&&(c.y < -c.radius||c.y > height+c.radius))continue;
  const distance=Math.hypot(x-c.x,y-c.y);
  if(distance>c.radius)continue;
  const normalized=distance/c.radius;
  if(normalized<score){score=normalized;best=c.pick}
 }
 return best;
}
