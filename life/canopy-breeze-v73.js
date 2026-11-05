// v73: Original village tree canopy breeze. Pure deterministic sampling keeps
// the scene reproducible, avoids per-frame randomness, and respects reduced motion.
// Angles are radians and intentionally subtle so branches never clip paths.
const finite=v=>Number.isFinite(v)?v:0;
export function sampleCanopyBreeze(time=0,x=0,z=0,axis=0,reducedMotion=false){
 if(reducedMotion)return 0;
 const t=finite(time),px=finite(x),pz=finite(z);
 const phase=px*.0014+pz*.0009;
 // A shared, slow gust passes through neighboring trees, with local variation.
 const gust=.55+.45*Math.sin(t*.21+phase*.7);
 const sway=Math.sin(t*.83+phase)+.28*Math.sin(t*1.29+px*.003-pz*.002);
 const axisOffset=axis===1?1.57:0;
 const ripple=Math.sin(t*.48+phase*.6+axisOffset);
 const angle=(sway*.011+ripple*.003)*(.58+.42*gust);
 return Math.max(-.018,Math.min(.018,angle));
}
