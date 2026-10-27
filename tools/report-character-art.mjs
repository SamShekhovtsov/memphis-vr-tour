import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
const folder='docs/design/screenshots/',out='docs/design/performance/character-art/';fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=new Set(),read=name=>{const file=name+'.json';inputs.add(file);return JSON.parse(fs.existsSync(folder+file)?fs.readFileSync(folder+file):gunzipSync(fs.readFileSync(out+file+'.gz')));};
const med=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)],performance=[];
const baseline=JSON.parse(fs.readFileSync('content/source-assets/character-art-baseline/index.json'));
for(const [label,tier]of [['character-art-tour','balanced'],['character-art-cinematic','cinematic']]){
 const phases=JSON.parse(fs.readFileSync(out+label+'-phases.json'));
 const pairs=[];
 for(let i=1;i<=3;i++){
  const a=read('hero-street-main-'+label+'-before-'+i),b=read('hero-street-main-'+label+'-after-'+i);
  for(const j of [a,b]){assert.equal(j.frameIntervalsMs.samples,539);assert.equal(j.heroPeople,126);assert.match(j.gpu.renderer,/HD Graphics 4600/);assert.ok(!/renderPerf=legacy|intelligence=legacy/.test(j.url));}
  assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.viewport,b.viewport);assert.equal(a.quality,b.quality);
  for(const phase of ['before','after']){
   const logged=phases.find(r=>r.label===label+'-'+phase+'-'+i);assert.ok(logged);
   for(const [file,h]of Object.entries(logged.assets))assert.equal(h,sha(fs.readFileSync(phase==='before'?baseline[file]:file)),'Asset phase mismatch '+file);
  }
  pairs.push({run:i,before:a.frameIntervalsMs,after:b.frameIntervalsMs});
 }
 const before={p50:med(pairs.map(p=>p.before.p50)),p95:med(pairs.map(p=>p.before.p95))},after={p50:med(pairs.map(p=>p.after.p50)),p95:med(pairs.map(p=>p.after.p95))};
 performance.push({tier,runs:3,pairs,before,after,changePercent:{p50:(after.p50/before.p50-1)*100,p95:(after.p95/before.p95-1)*100}});
}
const matched=[];
for(const shot of ['hero-street-main','street-entry','hero-street-material']){
 const before=read(shot+'-character-art-before'),after=read(shot+'-character-art-after');assert.deepEqual(before.camera,after.camera);assert.deepEqual(before.viewport,after.viewport);assert.equal(before.animationSeconds,after.animationSeconds);matched.push({view:shot,camera:after.camera});
}
for(const sex of ['male','female']){
 const a=read('hero-street-main-character-'+sex+'-before'),b=read('hero-street-main-character-'+sex+'-after');assert.deepEqual(a.interactionAudit,b.interactionAudit);matched.push({view:sex+' reference portrait',...b.interactionAudit});
}
const inspections=['side','back'].map(view=>({view,...read('hero-street-main-character-female-'+view).interactionAudit}));
const behavior=read('hero-street-main-character-art-behavior').interactionAudit;assert.equal(behavior.passed,true);
const poses=JSON.parse(fs.readFileSync('content/source-assets/characters/character-art-pose-audit.json'));assert.equal(poses.length,14);assert.ok(poses.every(p=>p.outwardRayMisses===0));
const current=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/manifest.json')),original=JSON.parse(fs.readFileSync(baseline['apps/web-tour/public/assets/authored/people/manifest.json']));
const bytes=m=>m.assets.reduce((n,a)=>n+a.bytes,0),triangles=m=>m.assets.reduce((n,a)=>n+a.triangles,0);
const archive={};for(const name of inputs){const raw=fs.existsSync(folder+name)?fs.readFileSync(folder+name):gunzipSync(fs.readFileSync(out+name+'.gz'));const zip=gzipSync(raw,{level:9});assert.deepEqual(gunzipSync(zip),raw);fs.writeFileSync(out+name+'.gz',zip);archive[name]={archive:name+'.gz',sha256:sha(raw),bytes:raw.length,compressedBytes:zip.length};}
fs.writeFileSync(out+'index.json',JSON.stringify({format:'gzip; exact original JSON bytes',files:archive},null,2)+'\n');
const report={date:'2026-10-27',hardware:'Intel HD 4600 / D3D11',protocol:'Three alternating asset pairs per tier, 1280x720, 300 simulated seconds crowd warmup, 600 full-tour frames, first 61 excluded. Same controller, rendering, cameras and population in both modes. Source/asset bytes restored and hash-verified after each suite.',performance,geometry:{beforeBytes:bytes(original),afterBytes:bytes(current),downloadChangePercent:(bytes(current)/bytes(original)-1)*100,beforeTriangles:triangles(original),afterTriangles:triangles(current),referenceTopology:JSON.parse(fs.readFileSync('content/source-assets/characters/character-art-reference-topology.json'))},matched,inspections,poses,behavior:{passed:behavior.passed,checks:behavior.checks.map(({name,passed})=>({name,passed})),participants:behavior.tasks.length,completedResidents:behavior.tasks.filter(t=>t.completed>0).length,completions:behavior.tasks.reduce((n,t)=>n+t.completed,0)}};
fs.writeFileSync('docs/design/character-art-steps-1-2-2026-10-27.json',JSON.stringify(report,null,2)+'\n');
for(const row of performance)console.log(`${row.tier}: ${row.before.p50.toFixed(1)}/${row.before.p95.toFixed(1)} -> ${row.after.p50.toFixed(1)}/${row.after.p95.toFixed(1)} ms; ${row.changePercent.p50.toFixed(1)}%/${row.changePercent.p95.toFixed(1)}%`);
console.log('Matched views and all asset phases verified; original reports archived losslessly');
