import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
const folder='docs/design/screenshots/',out='docs/design/performance/character-action/';fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=new Set();
const read=name=>{const file=name+'.json';inputs.add(file);return JSON.parse(fs.existsSync(folder+file)?fs.readFileSync(folder+file):gunzipSync(fs.readFileSync(out+file+'.gz')));};
const med=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)],performance=[];
const index=JSON.parse(fs.readFileSync('content/source-assets/character-action-baseline/index.json')),runtime=Object.keys(index).filter(f=>f.startsWith('apps/web-tour/src/scene/'));
for(const [label,tier]of [['character-action-tour','balanced'],['character-action-cinematic','cinematic']]){
 const phases=JSON.parse(fs.readFileSync(out+label+'-phases.json')),pairs=[];
 for(let i=1;i<=3;i++){
  const a=read('hero-street-main-'+label+'-before-'+i),b=read('hero-street-main-'+label+'-after-'+i);
  for(const j of [a,b]){assert.equal(j.frameIntervalsMs.samples,539);assert.equal(j.heroPeople,126);assert.match(j.gpu.renderer,/HD Graphics 4600/);assert.ok(!/renderPerf=legacy|intelligence=legacy/.test(j.url));assert.equal(j.textureErrors.length,0);}
  assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.viewport,b.viewport);assert.equal(a.quality,b.quality);
  for(const phase of ['before','after']){const p=phases.find(r=>r.label===label+'-'+phase+'-'+i);assert.ok(p);assert.deepEqual(Object.keys(p.assets).sort(),runtime.slice().sort());for(const [f,h]of Object.entries(p.assets))assert.equal(h,sha(fs.readFileSync(phase==='before'?index[f]:f)));}
  pairs.push({run:i,before:a.frameIntervalsMs,after:b.frameIntervalsMs});
 }
 const before={p50:med(pairs.map(p=>p.before.p50)),p95:med(pairs.map(p=>p.before.p95))},after={p50:med(pairs.map(p=>p.after.p50)),p95:med(pairs.map(p=>p.after.p95))};
 performance.push({tier,runs:3,pairs,before,after,changePercent:{p50:(after.p50/before.p50-1)*100,p95:(after.p95/before.p95-1)*100}});
}
const matched=[];
for(const shot of ['hero-street-main','street-entry','hero-street-material']){
 const a=read(shot+'-character-polish-before'),b=read(shot+'-character-polish-after');assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.viewport,b.viewport);assert.deepEqual(a.layoutRoots,b.layoutRoots);assert.equal(a.animationSeconds,b.animationSeconds);assert.equal(a.heroPeople,b.heroPeople);
 for(const key of ['meshes','vertices','drawCalls'])assert.equal(a[key],b[key],shot+' changed '+key);
 matched.push({view:shot,camera:b.camera,drawCalls:b.drawCalls,estimatedTextureMiB:{before:a.estimatedTextureMiB,after:b.estimatedTextureMiB}});
}
for(const sex of ['female','male']){const stem='hero-street-main-character-polish-'+sex+'-',a=read(stem+'before'),b=read(stem+'after');assert.deepEqual(a.interactionAudit,b.interactionAudit);matched.push({view:sex,...b.interactionAudit});}
const motion=[];for(const phase of ['before','after']){const j=read('hero-street-main-character-actions-30s-'+phase),r=j.motionRecording;assert.equal(r.simulationSeconds,30);assert.equal(r.state.complete,true);assert.equal(r.state.frame,900);assert.ok(r.encodedFrames>=100);motion.push({phase,...r});}assert.deepEqual(motion[0].state.camera,motion[1].state.camera);
for(const phase of ['open','closed'])read('hero-street-main-character-actions-blink-'+phase);
const audit=read('hero-street-main-character-actions-motion-audit').interactionAudit;
assert.equal(audit.people,126);assert.equal(audit.participants,63);assert.ok(audit.interpolated>0&&audit.interpolated<=1800*6);assert.ok(audit.workContacts>0&&audit.maxWorkError<.025);assert.ok(audit.maxWrist<.65);assert.equal(audit.actions.eyelids.length,2);
assert.ok(audit.plantedSamples>0&&audit.maxFootError<.01,'Live planted-foot solver error exceeded 1cm');
const behavior=read('hero-street-main-character-actions-behavior').interactionAudit;assert.equal(behavior.passed,true);
const prototype={before:read('hero-street-main-character-action-prototype-before-1').frameIntervalsMs,after:read('hero-street-main-character-action-prototype-after-1').frameIntervalsMs};
const logs=JSON.parse(fs.readFileSync(out+'character-action-prototype-phases.json'));
for(const phase of ['before','after'])for(const [f,h]of Object.entries(logs.find(p=>p.phase===phase).assets)){let b=fs.readFileSync(f);if(phase==='before'&&f.endsWith('InstancedDistrictCrowd.ts'))b=Buffer.from(b.toString().replace('if(slot>=0&&near){','if(false&&slot>=0&&near){'));assert.equal(h,sha(b));}
const archive={};for(const name of inputs){const raw=fs.existsSync(folder+name)?fs.readFileSync(folder+name):gunzipSync(fs.readFileSync(out+name+'.gz'));const zip=gzipSync(raw,{level:9});assert.deepEqual(gunzipSync(zip),raw);fs.writeFileSync(out+name+'.gz',zip);archive[name]={archive:name+'.gz',sha256:sha(raw),bytes:raw.length,compressedBytes:zip.length};}
fs.writeFileSync(out+'index.json',JSON.stringify({format:'gzip; exact original JSON bytes',files:archive},null,2)+'\n');
const report={date:'2026-10-27',hardware:'Intel HD4600 / D3D11',protocol:'1280x720; three alternating before/after pairs per tier, 300 simulated seconds crowd warmup, 600 tour frames, first61 excluded,539 samples. Same rendering and decision/navigation code. Only three actor presentation sources swapped; exact final bytes restored.',performance,prototype,poseTextureMemory:{format:"RGBA32F",textures:2,width:656,beforeRows:608,afterRows:1219,beforeBytes:2*656*608*16,afterBytes:2*656*1219*16},matched,motion,audit,behavior:{passed:behavior.passed,checks:behavior.checks.map(({name,passed})=>({name,passed})),completedResidents:behavior.tasks.filter(t=>t.completed>0).length,completions:behavior.tasks.reduce((n,t)=>n+t.completed,0)}};
fs.writeFileSync('docs/design/character-actions-steps-5-6-2026-10-27.json',JSON.stringify(report,null,2)+'\n');
for(const r of performance){console.log(`${r.tier}: ${r.before.p50.toFixed(1)}/${r.before.p95.toFixed(1)} -> ${r.after.p50.toFixed(1)}/${r.after.p95.toFixed(1)} ms; ${r.changePercent.p50.toFixed(1)}%/${r.changePercent.p95.toFixed(1)}%`);assert.ok(r.changePercent.p50<=10&&r.changePercent.p95<=10,'10% performance budget exceeded: '+r.tier);}
console.log('Five matched views, two30-second motion captures, contact/wrist/interpolation audit, behavior preservation and all comparison source phases passed');
