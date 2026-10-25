import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/design/screenshots/';
const read=name=>JSON.parse(fs.readFileSync(dir+name+'.json'));
const med=a=>{a=[...a].sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
const phases={};let session;
for(const phase of ['before','after']){
 const rows=[1,2,3,4,5].map(n=>read(`hero-street-main-render-depth-final-${phase}-${n}`));
 for(const r of rows){
  session??=r.browserSession;assert.equal(r.browserSession,session);
  assert.equal(r.pacing,'default');assert.equal(r.frameIntervalsMs.samples,539);
  assert.deepEqual(r.benchmarkProtocol,{frames:600,warmupFrames:61,deterministicActorTime:true,route:'hero-street'});
  assert.equal(r.renderProfile.gpuTimerEnabled,false);assert.ok(!/SwiftShader/i.test(r.gpu.renderer));
  assert.deepEqual(r.textureErrors,[]);assert.equal(r.renderingOptimization.fallback,false);
  assert.equal(r.renderingOptimization.mode,phase==='before'?'legacy':'optimized');
 }
 phases[phase]={gpu:rows[0].gpu,renderSize:[rows[0].renderWidth,rows[0].renderHeight],p50:med(rows.map(r=>r.frameIntervalsMs.p50)),p95:med(rows.map(r=>r.frameIntervalsMs.p95)),runs:rows.map(r=>r.frameIntervalsMs),stages:Object.fromEntries(['frame','targets','main','active','animation','draws'].map(k=>[k,med(rows.map(r=>med(r.renderProfile.samples[k])))])),optimization:rows.at(-1).renderingOptimization};
}
const motion=[];
for(let n=1;n<=5;n++){
 const a=read(`hero-street-main-render-depth-final-before-${n}`),b=read(`hero-street-main-render-depth-final-after-${n}`);
 for(const k of ['camera','animationSeconds','actorAnimationGroups','rendering','peopleMaterials','contactShadows','estimatedTextureMiB','textures'])assert.deepEqual(a[k],b[k],k);
 let maxDifference=0,elements=0;
 for(const field of ['peoplePoseMatrices','moverPoseMatrices']){const nodes=new Map(b[field].map(v=>[v.name,v.world]));for(const node of a[field])node.world.forEach((v,i)=>{maxDifference=Math.max(maxDifference,Math.abs(v-nodes.get(node.name)[i]));elements++;});}
 assert.ok(maxDifference<1e-6);motion.push({run:n,elements,maxDifference});
}
const p50Change=phases.after.p50/phases.before.p50-1,p95Change=phases.after.p95/phases.before.p95-1;
const pairedChanges=phases.after.runs.map((r,i)=>r.p50/phases.before.runs[i].p50-1),fasterPairs=pairedChanges.filter(x=>x<0).length;
const gate=p50Change<=-.05&&p95Change<=.1&&fasterPairs>=3;
const method='Five alternating pairs (AB, BA, AB, BA, AB) in one hardware Chrome process. Balanced 1280×720, existing hero-street review segment, unchanged camera height/path and deterministic actor time; 600 rendered frames/run, first 61 excluded, 539 measured intervals/run and 2,695 per variant. Normal presentation pacing; GPU queries off; no build running. Median of five run percentiles. Before disables only the new depth pass. Temporary benchmark source edits restored and hash-verified.';
const images=JSON.parse(fs.readFileSync('docs/design/render-depth-image-checks-2026-10-25.json'));
const unit=JSON.parse(fs.readFileSync('docs/design/render-depth-checks-2026-10-25.json'));
const result={date:'2026-10-25',method,phases,p50Change,p95Change,pairedChanges,fasterPairs,gate,motion,images,unit};
fs.writeFileSync('docs/design/render-performance-results-2026-10-25.json',JSON.stringify(result,null,2)+'\n');
const lines=['# Hero-street rendering performance','','25 October 2026. Existing geometry, textures, lighting, shadows, quality tiers, LOD thresholds, character updates, layout, walking paths and cameras are preserved.','','## Bottleneck and change','','Profiling identified expensive main-pass shading and scene submission. A small early depth pass now draws only existing opaque authored ground and plaster occluders, allowing the original colour pass to reject hidden fragments. It uses Babylon’s native depth-only queue and original vertex processing, retaining the colour order. Characters, cloth, alpha surfaces and shadow-map rendering are excluded. Shader readiness is refreshed between depth and colour draws, following Babylon’s depth-prepass rule. The guarded Babylon 7 queue adapter falls back to stock rendering if its expected shape changes.','','Earlier transform/selection/material caching failed the longer timing gate and was rejected. Its code is archived in `content/source-assets/performance/RenderSelectionExperiment.ts`; measurements remain in `render-selection-failed-results-2026-10-25.json`. Black-output depth prototypes were also rejected and are not used for this result.','','## Measured result','',`GPU: ${phases.after.gpu.renderer}.`,'','| Variant | Frame p50 | Frame p95 |','| --- | --- | --- |',...['before','after'].map(k=>`| ${k} | ${phases[k].p50.toFixed(1)} ms | ${phases[k].p95.toFixed(1)} ms |`),'',`p50 ${(p50Change*100).toFixed(1)}%; p95 ${(p95Change*100).toFixed(1)}%; ${fasterPairs}/5 pairs faster. Gate (at least 5% median improvement, at most 10% p95 growth, majority of pairs faster): **${gate?'PASS':'FAIL'}**.`, '',method,'','| Pair | Before p50/p95 | After p50/p95 |','| --- | --- | --- |',...phases.before.runs.map((r,i)=>`| ${i+1} | ${r.p50.toFixed(1)} / ${r.p95.toFixed(1)} ms | ${phases.after.runs[i].p50.toFixed(1)} / ${phases.after.runs[i].p95.toFixed(1)} ms |`),'','CPU-side main submission rises from 12.8 to 15.7 ms and median draws from 296 to 307 because of the added depth work. The measured gain is in presented frame intervals; this is not a CPU-stage speed-up claim. GPU queries were excluded from the final timing set, so the fragment-shading mechanism is not independently quantified by GPU-busy timing.','','This is a desktop hero-street measurement on this hardware/session. It does not establish headset, cinematic-tier or whole-tour throughput. Stalls remain; the raw per-run samples and CPU stage timings are retained in the JSON.','','## Matched evidence','','Three original locked bookmark images match pixel for pixel after the change. Moving checkpoints additionally compare camera state, materials, texture storage, layout roots and character/bird/smoke joint matrices. All measured endpoint matrices match within 1e-6.','','| View | Before | After |','| --- | --- | --- |',...['hero-street-main','hero-street-material','street-entry'].map(s=>`| ${s} | [Before](screenshots/${s}-render-perf-before.png) | [After](screenshots/${s}-render-depth-ready.png) |`),'','See `render-depth-image-checks-2026-10-25.json` and `render-depth-checks-2026-10-25.json` for strict checks. Renderer revision validation protects 111 unchanged scene/data/asset files.','','Reproduce with `node tools/benchmark-rendering.mjs --batch --hero-street --runs=5 --label=render-depth-final`, with builders and other captures idle. This overwrites the named benchmark evidence. `node tools/test-render-depth.mjs` checks occluder eligibility, duplicates, pass exclusions, fallback and unchanged geometry/material/depth flags.','','Temporary source edits from capture harnesses are restored in finally blocks. No production route/camera edits are needed.'];
fs.writeFileSync('docs/design/render-performance-results-2026-10-25.md',lines.join('\n')+'\n');
console.log(JSON.stringify({p50Change,p95Change,fasterPairs,gate,phases},null,2));if(!gate)process.exitCode=2;
