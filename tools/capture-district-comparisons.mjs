/** Matched diagnostic views. Original visual files are restored even after a failed capture. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve('apps/web-tour/public/assets/authored/hero-street'),baseline=path.resolve('content/source-assets/lighting/exterior-repair/baseline');
const names=['manifest.json',...['near','mid','far'].flatMap(p=>[`${p}-irradiance.png`,`${p}-irradiance.webp`,...['','.lod1','.lod2'].map(l=>`hero_street_corridor_${p}${l}.glb`)])];
const final=new Map(names.map(n=>[n,fs.readFileSync(path.join(root,n))]));const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(name,bytes)=>{for(let i=0;;i++){try{fs.writeFileSync(path.join(root,name),bytes);return;}catch(e){if(i===24)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}}};
let port=9600;
const capture=(phase,view)=>execFileSync(process.execPath,['tools/capture-hero-shot.mjs',`district-${view}-${phase}`,'--hardware',`--district-view=${view}`,...(phase==='before'?['--population=legacy']:[])],{stdio:'inherit',env:{...process.env,CDP_PORT:String(port++)}});
try{
 for(const n of names)write(n,fs.readFileSync(path.join(baseline,n)));
 for(const view of ['north','hands'])capture('before',view);
 for(const [n,b]of final)write(n,b);
 for(const view of ['north','hands'])capture('after',view);
 for(const view of ['north','hands']){const read=phase=>JSON.parse(fs.readFileSync(`docs/design/screenshots/hero-street-main-district-${view}-${phase}.json`));assert.deepEqual(read('before').camera,read('after').camera,'Matched camera changed');assert.deepEqual(read('before').viewport,read('after').viewport);}
 execFileSync(process.execPath,['tools/capture-hero-shot.mjs','district-finished','--hardware','--all'],{stdio:'inherit',env:{...process.env,CDP_PORT:String(port++)}});
}finally{for(const [n,b]of final){write(n,b);assert.equal(sha(fs.readFileSync(path.join(root,n))),sha(b));}console.log('Final exterior files restored and hashes verified');}
