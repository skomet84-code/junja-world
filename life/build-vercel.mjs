// Copy only browser-safe assets into Vercel's static output directory.
import {mkdir,copyFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const assets=[
 'index.html','account-ui.js','admin-panel.js','game.js','world3d.js','avatar3d.js','fashion-3d.js',
 'fashion-catalog.js','life-systems-v20.js','navigation.js',
 'hunt.html','hunt.js','hunt-data.js','fish-portraits.js','living-world.js',
 'economy-v28.js','inventory-v29.js','combat-potions-v29.js','combat-progression-v30.js',
 'save-client.js','quality-v32.js','auto-fishing-v31.js','estate-trade-v34.js','estate-layout-v35.js','estate-world-v35.js','secure-economy-ui-v36.js','secure-economy-ui-v37.js','player-market-ui-v38.js','professions-ui-v39.js','business-ui-v40.js','vendor/three.module.js','vendor/THREE-LICENSE.txt'
];
for(const src of assets){
 const dst=join('public',src);
 await mkdir(dirname(dst),{recursive:true});
 await copyFile(src,dst);
}
console.log('Prepared '+assets.length+' public village assets for Vercel');
