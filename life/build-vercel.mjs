// Copy only browser-safe assets into Vercel's static output directory.
import {mkdir,copyFile,readFile} from 'node:fs/promises';
import {join,dirname,posix} from 'node:path';
const assets=[
 'action-energy-v47.js','secure-economy-v36.js',
 'index.html','account-ui.js','admin-panel.js','game.js','world-energy-v53.js','farm-plots-v52.js','world3d.js','avatar3d.js','fashion-3d.js',
 'fashion-catalog.js','life-systems-v20.js','navigation.js',
 'hunt.html','hunt.js','hunt-data.js','hunt-balance-v54.js','hunt-weekly-v55.js','farm-batch-v55.js','hunt-loot-market-v55.js','village-arcade-v55.js','fish-portraits.js','living-world.js',
 'economy-v28.js','inventory-v29.js','combat-potions-v29.js','combat-progression-v30.js',
 'save-client.js','quality-v32.js','auto-fishing-v31.js','estate-trade-v34.js','estate-layout-v35.js','estate-world-v35.js','secure-economy-ui-v36.js','secure-economy-ui-v37.js','player-market-ui-v38.js','professions-ui-v39.js','business-ui-v40.js','workshop-plots-v41.js','workshop-world-v41.js','workshop-ui-v41.js','district-portal-v42.js','village-life-v43.js','resident-demand-ui-v44.js','customer-loyalty-ui-v45.js','business-honors-ui-v46.js','action-energy-ui-v47.js','home-interiors-v48.js','home-room-3d-v48.js','home-studio-ui-v48.js','village-navigation-v49.js','village-economy-guide-v50.js','quests-ui-v51.js','vendor/three.module.js','vendor/THREE-LICENSE.txt'
];
// Validate the complete static module graph before copying anything.
const published=new Set(assets);
for(const src of assets.filter(x=>x.endsWith('.js'))){
 const source=await readFile(src,'utf8');
 const imports=source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g);
 for(const match of imports){
  const spec=match[1].split(/[?#]/)[0];
  if(!spec.startsWith('.'))continue;
  const target=posix.normalize(posix.join(posix.dirname(src),spec));
  if(!published.has(target))throw Error(`Missing browser dependency: ${src} -> ${target}`);
 }
}
for(const src of assets){
 const dst=join('public',src);
 await mkdir(dirname(dst),{recursive:true});
 await copyFile(src,dst);
}
console.log('Prepared '+assets.length+' public village assets for Vercel');
