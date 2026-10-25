import fs from 'node:fs';
const source='content/source-assets/image-quality/',target='apps/web-tour/public/assets/authored/hero-street/';
const names=['manifest.json',...['mid'].flatMap(p=>['','.lod1','.lod2'].map(l=>`hero_street_corridor_${p}${l}.glb`))];
for(const name of names){const bytes=fs.readFileSync(source+name);fs.writeFileSync(target+name,name.endsWith('.json')?bytes.toString().replaceAll('\r\n','\n'):bytes);}
console.log('Promoted two duplicate-cloth removals; existing transforms, UVs and indirect maps retained');
