// Copy only browser-safe assets into Vercel's static output directory.
import {mkdir,copyFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const assets=[
 'index.html','game.js','world3d.js','avatar3d.js','fashion-3d.js',
 'fashion-catalog.js','life-systems-v20.js','navigation.js',
 'vendor/three.module.js','vendor/THREE-LICENSE.txt'
];
for(const src of assets){
 const dst=join('public',src);
 await mkdir(dirname(dst),{recursive:true});
 await copyFile(src,dst);
}
console.log('Prepared '+assets.length+' public village assets for Vercel');
