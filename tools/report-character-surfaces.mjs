import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
const folder='docs/design/screenshots/',out='docs/design/performance/character-surface/';fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=new Set();
const read=name=>{const file=name+'.json';inputs.add(file);return JSON.parse(fs.existsSync(folder+file)?fs.readFileSync(folder+file):gunzipSync(fs.readFileSync(out+file+'.gz')));};
const med=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)],performance=[];
const index=JSON.parse(fs.readFileSync('content/source-assets/character-surface-baseline/index.json'));
for(const [label,tier]of [['character-surface-tour','balanced'],['character-surface-cinematic','cinematic']]){
 const phases=JSON.parse(fs.readFileSync(out+label+'-phases.json')),pairs=[];
 for(let i=1;i<=3;i++){
  const a=read('hero-street-main-'+label+'-before-'+i),b=read('hero-street-main-'+label+'-after-'+i);
  for(const j of [a,b]){assert.equal(j.frameIntervalsMs.samples,539);assert.equal(j.heroPeople,126);assert.match(j.gpu.renderer,/HD Graphics 4600/);assert.ok(!/renderPerf=legacy|intelligence=legacy/.test(j.url));}
  assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.viewport,b.viewport);assert.equal(a.quality,b.quality);
  for(const phase of ['before','after']){
   const p=phases.find(r=>r.label===label+'-'+phase+'-'+i);assert.ok(p);assert.deepEqual(Object.keys(p.assets),['apps/web-tour/src/scene/HeroPeopleMaterials.ts']);
   for(const [f,h]of Object.entries(p.assets))assert.equal(h,sha(fs.readFileSync(phase==='before'?index[f]:f)));
  }
  pairs.push({run:i,before:a.frameIntervalsMs,after:b.frameIntervalsMs});
 }
 const before={p50:med(pairs.map(p=>p.before.p50)),p95:med(pairs.map(p=>p.before.p95))},after={p50:med(pairs.map(p=>p.after.p50)),p95:med(pairs.map(p=>p.after.p95))};
 performance.push({tier,runs:3,pairs,before,after,changePercent:{p50:(after.p50/before.p50-1)*100,p95:(after.p95/before.p95-1)*100}});
}
const matched=[];
for(const shot of ['hero-street-main','street-entry','hero-street-material']){
 const a=read(shot+'-character-surface-before'),b=read(shot+'-character-surface-after');assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.viewport,b.viewport);assert.deepEqual(a.layoutRoots,b.layoutRoots);assert.equal(a.animationSeconds,b.animationSeconds);assert.equal(a.heroPeople,b.heroPeople);
 for(const key of ['meshes','vertices','activeIndices','drawCalls','estimatedTextureMiB'])assert.equal(a[key],b[key],shot+' changed '+key);
 matched.push({view:shot,camera:b.camera,drawCalls:b.drawCalls,estimatedTextureMiB:b.estimatedTextureMiB});
}
for(const sex of ['female','male'])for(const tier of ['balanced','cinematic']){
 const stem='hero-street-main-character-surface-'+sex+'-'+(tier==='cinematic'?'cinematic-':'');const a=read(stem+'before'),b=read(stem+'after');assert.deepEqual(a.interactionAudit,b.interactionAudit);assert.deepEqual(a.viewport,b.viewport);assert.equal(a.quality,b.quality);
 assert.equal(b.peopleMaterials.id,'character-surfaces-v2');assert.equal(b.peopleMaterials.textureCount,tier==='cinematic'?9:6);assert.equal(a.peopleMaterials.textureCount,b.peopleMaterials.textureCount);
 assert.ok(b.peopleMaterials.bindings.every(v=>v.albedoSrgb&&v.normalLinear&&!v.alphaTest));assert.equal(b.textureErrors.length,0);
 matched.push({view:sex+' '+tier,...b.interactionAudit,materials:b.peopleMaterials});
}
const archive={};for(const name of inputs){const raw=fs.existsSync(folder+name)?fs.readFileSync(folder+name):gunzipSync(fs.readFileSync(out+name+'.gz'));const zip=gzipSync(raw,{level:9});assert.deepEqual(gunzipSync(zip),raw);fs.writeFileSync(out+name+'.gz',zip);archive[name]={archive:name+'.gz',sha256:sha(raw),bytes:raw.length,compressedBytes:zip.length};}
fs.writeFileSync(out+'index.json',JSON.stringify({format:'gzip; exact original JSON bytes',files:archive},null,2)+'\n');
const old=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/manifest.json')),current=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/surfaces-v2/manifest.json')),sum=maps=>Object.values(maps).reduce((n,v)=>n+v.bytes,0);
const report={date:'2026-10-27',hardware:'Intel HD 4600 / D3D11',protocol:'Three alternating before/after pairs per tier, 1280x720, 300 simulated seconds crowd warmup, 600 full-tour frames, first 61 excluded. Only the character material binder is swapped. Same geometry, controller, rendering, cameras, population and AI. Final source bytes restored by hash.',performance,matched,textures:{beforeBytes:sum(old.materialRefinement.maps),afterBytes:sum(current.maps),downloadChangePercent:(sum(current.maps)/sum(old.materialRefinement.maps)-1)*100,maps:9,resolution:512,balancedResidentMaps:6,cinematicResidentMaps:9},geometryChanged:false,lockedFiles:Object.keys(JSON.parse(fs.readFileSync('content/source-assets/character-surface-baseline/locked.json'))).length};
fs.writeFileSync('docs/design/character-surfaces-steps-3-4-2026-10-27.json',JSON.stringify(report,null,2)+'\n');
for(const r of performance){assert.ok(r.changePercent.p50<=10&&r.changePercent.p95<=10,'Existing 10% frame-time budget exceeded: '+r.tier);console.log(`${r.tier}: ${r.before.p50.toFixed(1)}/${r.before.p95.toFixed(1)} -> ${r.after.p50.toFixed(1)}/${r.after.p95.toFixed(1)} ms; ${r.changePercent.p50.toFixed(1)}%/${r.changePercent.p95.toFixed(1)}%`);}
console.log('Seven matched views, all binder phases and lossless raw archives verified');
