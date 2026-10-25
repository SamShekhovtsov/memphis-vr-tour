import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const write=(f,b)=>{for(let n=0;;n++){try{fs.writeFileSync(f,b);return;}catch(e){if(n>=24)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}}};
const sha=b=>createHash('sha256').update(b).digest('hex');
const names=['manifest.json',...['near','mid','far'].flatMap(p=>[p+'-irradiance.png',p+'-irradiance.webp',...['','.lod1','.lod2'].map(l=>`hero_street_corridor_${p}${l}.glb`)])];
const files=names.map(n=>['apps/web-tour/public/assets/authored/hero-street/'+n,'content/generated/steps78-before/hero-street/'+n]);
for(const n of ['RenderingTiers.ts','HeroStreetMaterials.ts'])files.push(['apps/web-tour/src/scene/'+n,'content/generated/steps78-before/'+n]);
const originals=new Map(files.map(([f])=>[f,fs.readFileSync(f)]));
const route=phase=>execFileSync(process.execPath,['tools/benchmark-rendering.mjs','--batch','--optimized-only','--hero-street','--checkpoints','--three-checkpoints','--quality=balanced','--label=steps78-route-'+phase],{stdio:'inherit'});
const capture=(label,args=[])=>execFileSync(process.execPath,['tools/capture-hero-shot.mjs',label,'--hardware',...args],{stdio:'inherit',env:{...process.env,CDP_PORT:'9565'}});
try{
 for(const [f,baseline]of files)write(f,fs.readFileSync(baseline));
 capture('steps78-reproduce-before',['--quality=cinematic']);
 route('before');
}finally{
 for(const [f,b]of originals){write(f,b);if(sha(fs.readFileSync(f))!==sha(b))throw Error('Restore failed: '+f);}
 console.log('Final runtime assets and lighting sources restored and hash-verified');
}
route('after');
capture('steps78-collisions',['--collision-audit','--quality=balanced']);
const jobs='content/generated/steps78-texture-comparisons.json';fs.writeFileSync(jobs,JSON.stringify([{label:'steps78-webp'},{label:'steps78-ktx',textureTrial:'1'},{label:'steps78-fallback',textureTrial:'fail'}]));
capture('steps78-compression',['--all','--quality=cinematic','--batch-json='+jobs]);
