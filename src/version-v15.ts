import './living-world-v16';
import './creature-art-v17';
import './combat-motion-v18';
import './world-atmosphere-v19';
import './target-combat-v20';
import './class-identity-v21';
import './equipment-evolution-v22';
import './village-hub-v23';
import './economy-link-v24';
import './commerce-admin-v25';
import './world-pet-v251';
import './account-admin-v26';
import './mobile-shell-v272';
import './quest-stability-v273';
import './quest-action-external-v273';
import './quest-ui-authority-v274';
import './quest-touch-v275';

function syncVersion(){document.querySelectorAll<HTMLElement>('.login-footer span').forEach(node=>{if(node.textContent?.includes('JUNJA WORLD'))node.textContent='JUNJA WORLD v2.7.5';});const badge=document.querySelector<HTMLElement>('.jw-v09-badge b');if(badge)badge.textContent='JUNJA WORLD v2.7.5';}
function boot(){syncVersion();window.setTimeout(syncVersion,600);window.setTimeout(syncVersion,1800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
