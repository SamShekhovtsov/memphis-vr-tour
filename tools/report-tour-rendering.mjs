import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/design/screenshots/';
const read=n=>JSON.parse(fs.readFileSync(dir+n+'.json'));
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const results={};
for(const tier of ['balanced','cinematic']){
 let session;const phases={};
 for(const phase of ['before','after']){
  const rows=[1,2,3,4,5].map(n=>read(`hero-street-main-render-tour-${tier}-${phase}-${n}`));
  for(const r of rows){
   session??=r.browserSession;assert.equal(r.browserSession,session);
   assert.equal(r.pacing,'default');assert.equal(r.frameIntervalsMs.samples,539);
   assert.equal(r.quality,tier);assert.equal(r.rendering.tier,tier);
   assert.equal(r.rendering.antialiasing,tier==='cinematic'?'MSAA4 + FXAA':'FXAA');
   assert.equal(r.rendering.shadowFilter,tier==='cinematic'?'PCSS':'PCF');assert.equal(r.rendering.shadowMapSize,2048);
   assert.deepEqual(r.benchmarkProtocol,{frames:600,warmupFrames:61,deterministicActorTime:true,route:'full-tour'});
   assert.equal(r.renderProfile.gpuTimerEnabled,false);assert.ok(!/SwiftShader/i.test(r.gpu.renderer));
   assert.deepEqual(r.textureErrors,[]);assert.equal(r.renderingOptimization.fallback,false);
   assert.equal(r.renderingOptimization.mode,phase==='before'?'legacy':'optimized');
   for(const k of ['frame','targets','main','active','animation','draws'])assert.equal(r.renderProfile.samples[k].length,539);
   assert.ok(r.streetLods.every(l=>l.failed.length===0));
  }
  phases[phase]={gpu:rows[0].gpu,renderSize:[rows[0].renderWidth,rows[0].renderHeight],rendering:rows[0].rendering,p50:median(rows.map(r=>r.frameIntervalsMs.p50)),p95:median(rows.map(r=>r.frameIntervalsMs.p95)),runs:rows.map(r=>r.frameIntervalsMs),stages:Object.fromEntries(['frame','targets','main','active','animation','draws'].map(k=>[k,median(rows.map(r=>median(r.renderProfile.samples[k])))])),optimization:rows.at(-1).renderingOptimization};
 }
 const endpoints=[];
 for(let n=1;n<=5;n++){
  const a=read(`hero-street-main-render-tour-${tier}-before-${n}`),b=read(`hero-street-main-render-tour-${tier}-after-${n}`);
  for(const k of ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','peopleMaterials','contactShadows','estimatedTextureMiB','textures','renderWidth','renderHeight'])assert.deepEqual(a[k],b[k],tier+': '+k);
  assert.deepEqual([...a.layoutRoots].sort((x,y)=>x.name.localeCompare(y.name)),[...b.layoutRoots].sort((x,y)=>x.name.localeCompare(y.name)));
  let maxDifference=0,elements=0;
  for(const field of ['peoplePoseMatrices','moverPoseMatrices']){const nodes=new Map(b[field].map(v=>[v.name,v.world]));for(const node of a[field])node.world.forEach((v,i)=>{maxDifference=Math.max(maxDifference,Math.abs(v-nodes.get(node.name)[i]));elements++;});}
  assert.ok(maxDifference<1e-6);endpoints.push({run:n,elements,maxDifference});
 }
 const p50Change=phases.after.p50/phases.before.p50-1,p95Change=phases.after.p95/phases.before.p95-1;
 const pairedChanges=phases.after.runs.map((r,i)=>r.p50/phases.before.runs[i].p50-1),fasterPairs=pairedChanges.filter(x=>x<0).length;
 const verdict=p50Change<=-.05&&p95Change<=.1&&fasterPairs>=3?'measured improvement':p50Change>.1||p95Change>.1?'regression beyond 10% budget':'no conclusive gain';
 results[tier]={phases,p50Change,p95Change,pairedChanges,fasterPairs,verdict,endpoints};
}
const images=JSON.parse(fs.readFileSync('docs/design/render-tour-image-checks-2026-10-25.json'));
const pixelIdentical=Object.values(images).every(v=>v.changedPixels===0);
const method='Five alternating before/after pairs per tier (AB, BA, AB, BA, AB). One fresh hardware Chrome process per tier; sequential fresh page targets, identical 1280×720 viewport and hardware renderer. Normal/default presentation pacing, GPU timing queries disabled, builders/captures otherwise idle. Each run sweeps the complete existing Nile-to-Ptah guided camera route over 600 rendered frames, with frame-driven character time. First 61 frames excluded from timing: 539 intervals/run, 2,695 per variant/tier. Values are medians of five run percentiles. This is an accelerated route sweep, not the real-time 210-second playback or an XR qualification. Startup excluded; existing LOD streaming retained. Before disables only the new depth pass. Production source edits from the harness are restored and hash-verified.';
fs.writeFileSync('docs/design/render-tour-results-2026-10-25.json',JSON.stringify({date:'2026-10-25',method,results,pixelIdentical,images},null,2)+'\n');
const doc=['# Full-tour rendering qualification','','25 October 2026. Testing only: no production scene/render implementation, asset, layout, position, walking-path or camera changes. The benchmark tool now forwards its requested quality tier to the capture tool; actual tier, antialiasing and shadow settings are asserted in every result.','','## Results','', '| Full-route sweep | Before p50 / p95 | After p50 / p95 | p50 / p95 change | Faster pairs |','| --- | --- | --- | --- | --- |',...Object.entries(results).map(([tier,r])=>`| ${tier} | ${r.phases.before.p50.toFixed(1)} / ${r.phases.before.p95.toFixed(1)} ms | ${r.phases.after.p50.toFixed(1)} / ${r.phases.after.p95.toFixed(1)} ms | ${(r.p50Change*100).toFixed(1)}% / ${(r.p95Change*100).toFixed(1)}% | ${r.fasterPairs}/5 |`),'',...Object.entries(results).map(([tier,r])=>`${tier}: **${r.verdict}**.`),'',method,'','The improvement criterion matches the earlier hero-street report: at least 5% lower median, no more than 10% growth in p95, and at least three of five pairs faster. Failure to meet it is not described as an improvement. Stalls and background/driver variation remain visible in the raw runs. Comparisons are paired within each tier; absolute times from separate sessions or the earlier street-only test are not pooled.','','Balanced retains FXAA, 2048 PCF shadows and its original LOD/material settings. Cinematic retains MSAA4 + FXAA, 2048 PCSS shadows, 4× anisotropy, its longer LOD distances, ACES grading and vignette. No quality settings were reduced. Timing warm-up excludes the first approximately 10% of the route; screenshot checks additionally cover the fixed street bookmarks. The measurements do not include initial load time or qualify every frame of real-time playback.','','## Per-pair results','',...Object.entries(results).flatMap(([tier,r])=>[`### ${tier}`,'','| Pair | Before p50 / p95 | After p50 / p95 |','| --- | --- | --- |',...r.phases.before.runs.map((v,i)=>`| ${i+1} | ${v.p50.toFixed(1)} / ${v.p95.toFixed(1)} ms | ${r.phases.after.runs[i].p50.toFixed(1)} / ${r.phases.after.runs[i].p95.toFixed(1)} ms |`),'']),'## Matched screenshots and locks','',`${Object.keys(images).length} before/after image pairs: ${pixelIdentical?'all pixel-identical':'some pixels differ; see JSON for exact counts'}. Moving captures check world matrices for characters, birds and smoke, along with camera, materials, texture storage and layout roots. The ten paired benchmark endpoints also preserve those states.`, '', '| Tier / view | Before | After |','| --- | --- | --- |',...Object.entries(images).map(([name,v])=>`| ${name} | [Before](screenshots/${v.before}.png) | [After](screenshots/${v.after}.png) |`),'','The image-check JSON records exact pixel and pose differences; raw captures are retained. Source/asset/layout integrity validation is run after the benchmark harness restores production files.','','## Reproduce','', 'Run sequentially with builders and other captures idle:','','```powershell','node tools/benchmark-rendering.mjs --batch --runs=5 --quality=balanced --label=render-tour-balanced','node tools/benchmark-rendering.mjs --batch --runs=5 --quality=cinematic --label=render-tour-cinematic',...['balanced','cinematic'].map(t=>`node tools/benchmark-rendering.mjs --batch --checkpoints --three-checkpoints --quality=${t} --label=render-tour-${t}-quality`),'```','','`tools/verify-tour-rendering.py` checks the matched captures, and `node tools/report-tour-rendering.mjs` rebuilds this report and asserts the protocol. The earlier hero-street-only measurements remain in `render-performance-results-2026-10-25.md`.'];
fs.writeFileSync('docs/design/render-tour-results-2026-10-25.md',doc.join('\n')+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,r])=>[k,{before:r.phases.before.p50,after:r.phases.after.p50,p50Change:r.p50Change,p95Change:r.p95Change,fasterPairs:r.fasterPairs,verdict:r.verdict}])),null,2));
if(!pixelIdentical)process.exitCode=2;
