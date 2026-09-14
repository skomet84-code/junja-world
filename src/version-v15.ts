import './living-world-v16';
import './creature-art-v17';
import './combat-motion-v18';
import './world-atmosphere-v19';
import './target-combat-v20';
import './class-identity-v21';
import './equipment-evolution-v22';
import './village-hub-v23';

function syncVersion(){document.querySelectorAll<HTMLElement>('.login-footer span').forEach(node=>{if(node.textContent?.includes('JUNJA WORLD'))node.textContent='JUNJA WORLD v2.3.0';});const badge=document.querySelector<HTMLElement>('.jw-v09-badge b');if(badge)badge.textContent='JUNJA WORLD v2.3.0';}
function boot(){syncVersion();window.setTimeout(syncVersion,600);window.setTimeout(syncVersion,1800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
