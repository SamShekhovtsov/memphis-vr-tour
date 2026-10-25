import fs from 'node:fs';
import assert from 'node:assert/strict';
const folder='docs/design/screenshots/';
const read=name=>JSON.parse(fs.readFileSync(folder+name+'.json'));
const median=values=>{const a=[...values].sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const phases={};let session;
for(const phase of ['before','after']){
  const rows=[1,2,3,4,5].map(n=>read(`hero-street-main-render-final-${phase}-${n}`));
  for(const row of rows){
    assert.equal(row.pacing,'default');assert.equal(row.frameIntervalsMs.samples,539);assert.equal(row.benchmarkProgress,1);
    assert.deepEqual(row.benchmarkProtocol,{frames:600,warmupFrames:61,deterministicActorTime:true});
    session??=row.browserSession;assert.equal(row.browserSession,session,'Use one shared browser session');
    assert.equal(row.renderProfile.gpuTimerEnabled,false,'Final interval benchmark must exclude GPU-query overhead');
    assert.ok(!/SwiftShader/i.test(row.gpu.renderer));assert.deepEqual(row.textureErrors,[]);
    assert.ok(row.streetLods.every(lod=>!lod.failed.length));
    assert.equal(row.renderingOptimization.mode,phase==='before'?'legacy':'optimized');
    for(const key of ['frame','targets','main','active','animation','draws'])assert.equal(row.renderProfile.samples[key].length,539);
  }
  const stages=Object.fromEntries(['frame','targets','main','active','animation','draws'].map(k=>[k,median(rows.map(r=>median(r.renderProfile.samples[k])))]));
  phases[phase]={gpu:rows[0].gpu,renderSize:[rows[0].renderWidth,rows[0].renderHeight],p50:median(rows.map(r=>r.frameIntervalsMs.p50)),p95:median(rows.map(r=>r.frameIntervalsMs.p95)),stages,
    runs:rows.map(r=>({interval:r.frameIntervalsMs,stageMedians:Object.fromEntries(Object.entries(r.renderProfile.samples).filter(([k])=>k!=='gpu').map(([k,a])=>[k,median(a)])),shaderCompilationsAfterWarmup:r.renderProfile.samples.shaderCompiles.at(-1)-r.renderProfile.samples.shaderCompiles[0]})),optimization:rows.at(-1).renderingOptimization};
}
assert.deepEqual(phases.before.gpu,phases.after.gpu);assert.deepEqual(phases.before.renderSize,phases.after.renderSize);
const motion=[];
for(const run of [1,2,3,4,5]){
  const a=read(`hero-street-main-render-final-before-${run}`),b=read(`hero-street-main-render-final-after-${run}`);
  for(const key of ['camera','animationSeconds','actorAnimationGroups','rendering','peopleMaterials','contactShadows','estimatedTextureMiB','textures'])assert.deepEqual(a[key],b[key],key);
  let difference=0,elements=0;
  for(const field of ['peoplePoseMatrices','moverPoseMatrices']){
    const map=new Map(b[field].map(n=>[n.name,n.world]));
    for(const node of a[field]){assert.ok(map.has(node.name));node.world.forEach((v,i)=>{difference=Math.max(difference,Math.abs(v-map.get(node.name)[i]));elements++;});}
  }
  assert.ok(difference<1e-6,'Animation changed');motion.push({run,elements,maxDifference:difference});
}
const p50Change=phases.after.p50/phases.before.p50-1,p95Change=phases.after.p95/phases.before.p95-1;
const pairedChanges=phases.after.runs.map((r,i)=>r.interval.p50/phases.before.runs[i].interval.p50-1);
const fasterPairs=pairedChanges.filter(v=>v<0).length;
const gate=p50Change<=-.05&&p95Change<=.1&&fasterPairs>=3;
const images=JSON.parse(fs.readFileSync('docs/design/render-performance-image-checks-2026-10-25.json'));
const selection=JSON.parse(fs.readFileSync('docs/design/render-selection-checks-2026-10-25.json'));
const collisions=read('hero-street-main-render-perf-collisions').collisionAudit;assert.equal(collisions.passed,true);
const movement=read('hero-street-main-render-perf-motion-after').motionRecording;assert.equal(movement.state.frame,300);assert.equal(movement.state.complete,true);
const variance=JSON.parse(fs.readFileSync('docs/design/render-performance-initial-variance-2026-10-25.json'));
const pilots={};
for(const prefix of ['render-pilot','render-static-pilot','render-uncapped-pilot'])for(const phase of ['before','after']){
  const name=`hero-street-main-${prefix}-${phase}-1`,r=read(name);
  pilots[name]={frameIntervals:r.frameIntervalsMs,pacing:r.pacing??'default',profileGpuTimer:r.renderProfile.gpuTimerEnabled??null,optimization:r.renderingOptimization};
}
for(const mode of ['legacy','selection','materials','optimized']){
  const name=`hero-street-main-render-isolation-${mode}`,r=read(name);pilots[name]={frameIntervals:r.frameIntervalsMs,browserSession:r.browserSession,optimization:r.renderingOptimization};
}
const method='Five alternating before/after pairs in one hardware Chrome process (AB, BA, AB, BA, AB), normal/default presentation pacing; no uncapped flags. Balanced 1280×720, identical 600-frame camera route and frame-driven actor timeline. First 61 frames excluded; 539 intervals per run, 2,695 per variant. Report the median of five run p50/p95 values. CPU stage instrumentation is identical in both variants; GPU queries are disabled for the final comparison. Builders idle. Startup excluded, existing LOD streaming retained. renderPerf=legacy disables only the new renderer work; assets and previous character/IK optimizations are identical. Temporary timing hooks restored and hash-verified.';
const result={date:'2026-10-25',phases,p50Change,p95Change,pairedChanges,fasterPairs,gate,motion,images,selection,initialVariance:variance,pilots,collisionChecks:collisions.checks.length,method};
fs.writeFileSync('docs/design/render-performance-results-2026-10-25.json',JSON.stringify(result,null,2)+'\n');
const shots=['hero-street-main','hero-street-material','street-entry'];
const doc=[
  '# Rendering performance: static scene work', '',
  '25 October 2026. This changes CPU-side evaluation and binding of the existing renderer. No source geometry, textures, character positions, walking paths, district layout, camera bookmarks, lighting, shadow resolution/filter, antialiasing, post-processing settings or LOD thresholds were changed.', '',
  '## Profile and implementation', '',
  'Initial hardware profiling identified active-mesh evaluation and main submission as significant costs (representative CPU medians 6.5 and 6.0 ms, render targets 4.3 ms). The GPU elapsed-frame query reported 22.7 ms median; it includes elapsed command-stream time and is not a pure GPU-busy measurement. These diagnostic stages can overlap and must not be added. The sampling profile included startup and is not pooled with final benchmark timings.', '',
  '- Cache world transforms for immutable architecture. Imported animation targets and descendants, existing character roots, birds, smoke, skinned/morphed meshes and camera-dependent objects are excluded.',
  '- Put static meshes in a conservative 32-entry/depth-3 octree and keep moving, interactive, always-active and late-loaded objects in the dynamic set. Filter disabled candidates before costly mesh/material readiness checks. Sort candidates back into original scene order so transparent/coplanar ordering is retained. Shadows, picking and collision candidate providers are not replaced.',
  '- Cache the immutable authored PBR materials. Animated water and other untagged materials remain live. Image-processing changes release the material cache for the next render and recache the settled configuration; this covers quality/XR shader-configuration changes without claiming headset qualification.',
  '- Handle deferred mesh-added notifications synchronously at candidate selection as well, so newly streamed meshes are present on their first frame. Disposed meshes are removed. Skipping frustum clipping still uses the original candidate provider.', '',
  'The first narrow/deep index covered too few frozen meshes and sorting cost outweighed the savings. The revised version includes fixed procedural architecture and uses a coarser index. Material-only, selection-only and combined cases were isolated in one browser. Uncapped and fresh-browser pilots were inconsistent and are retained in the raw results; they are not used as the final improvement claim.', '',
  '## Final measured result', '',
  `GPU: ${phases.after.gpu.renderer}.`, '',
  '| Same visual scene | Median-run frame p50 | Median-run frame p95 | Scene-frame work, CPU-side elapsed |','| --- | --- | --- | --- |',
  ...['before','after'].map(p=>`| ${p} | ${phases[p].p50.toFixed(1)} ms | ${phases[p].p95.toFixed(1)} ms | ${phases[p].stages.frame.toFixed(1)} ms |`),'',
  `Frame p50 change ${(p50Change*100).toFixed(1)}%; p95 change ${(p95Change*100).toFixed(1)}%. ${fasterPairs}/5 paired medians improve. Gate (at least 5% lower median, at most 10% p95 growth, and a majority of pairs faster): **${gate?'PASS':'FAIL'}**.`, '',
  method, '',
  '| CPU-side stage median | Before | After |','| --- | --- | --- |',
  ...[['active','Active-mesh evaluation'],['main','Main draw submission'],['targets','Render targets']].map(([k,label])=>`| ${label} | ${phases.before.stages[k].toFixed(1)} ms | ${phases.after.stages[k].toFixed(1)} ms |`),'',
  `Final selection cache: ${phases.after.optimization.staticMeshes} initial static meshes; ${phases.after.optimization.dynamicMeshes} initial dynamic meshes; ${phases.after.optimization.frozenMaterials} authored materials. Late objects remain dynamic. Texture delivery and render resolution are unchanged. The Babylon total-vertex counter describes evaluated candidates and decreases when candidates are skipped; source geometry is unchanged, verified by asset hashes.`, '',
  'Frame stalls remain visible in the raw samples. This is a measured desktop result on this hardware/session, not a sustained FPS or headset guarantee. Cinematic-tier throughput and native Unity/Unreal rendering are not qualified here; the unchanged assets remain portable.', '',
  '## Matched visual and motion evidence', '',
  '| Locked bookmark | Before | After |','| --- | --- | --- |',
  ...shots.map(s=>`| ${s} | [Before](screenshots/${s}-render-perf-before.png) | [After](screenshots/${s}-render-perf-after.png) |`),'',
  'All three bookmark pairs use the original camera and frozen two-second state and match pixel for pixel. Seven additional exact-frame route checkpoints use the same actor and camera timeline, then stop rendering before capture. Their accepted comparisons also have zero changed pixels. The route snapshots and five final sweep endpoints check character, bird and smoke matrices without changing their update rate.', '',
  '| Route frame | Before | After |','| --- | --- | --- |',
  '| 90 (isolated controls) | [Before](screenshots/hero-street-main-render-visual-isolate-legacy-a.png) | [After](screenshots/hero-street-main-render-visual-isolate-optimized.png) |',
  ...[180,270,360,450,540,600].map(n=>`| ${n} | [Before](screenshots/hero-street-main-render-quality-checkpoint-${n}-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-${n}-after.png) |`),'',
  `One initial frame-90 pair differed in ${variance.changedPixels} distant wall-edge pixels (maximum channel delta ${variance.maxChannelDelta}). Repeating the unchanged renderer also differed from that original baseline by the same ${variance.changedPixels} pixels. In the isolated rerun, two unchanged controls and the selection-only, material-only and combined modes all matched exactly. The original mismatch is retained, not overwritten: [initial before](screenshots/hero-street-main-render-quality-checkpoint-90-before.png), [initial after](screenshots/hero-street-main-render-quality-checkpoint-90-after.png). This is recorded as baseline run-to-run variation; its underlying cause has not been isolated. The strict frame-90 quality check uses the repeated controlled pair.`, '',
  '[Optimized hero-street movement preview](screenshots/hero-street-main-render-perf-motion-after.motion.webp). The preview is a 300-step/ten-second simulation with sampled compositor frames, not a performance measurement.', '',
  '## Validation and reproduce', '',
  `Production build, original layout/actor/character/IK locks and the new 111-file renderer integrity check pass. The selection test covers ${selection.visibleCandidateChecks} visible-candidate checks over ${selection.cameraPoses} camera poses, stable draw order, moving roots, late objects, enable/dispose, the no-frustum fallback, live PBR water and image-processing cache invalidation. All ${collisions.checks.length} live collision checks pass, including Ptah floors and both village approaches.`, '',
  'The renderer-only revision is content/scene-data/hero-street.render-performance-revision.json. It reconstructs the unchanged HumanContactShadows.ts implementation after removing exactly the new import/call, hashes RenderWorkOptimization.ts, and protects scene/data/asset inputs. The original character and motion locks remain intact. No new external media or character assets were introduced.', '',
  'Run node tools/test-render-selection.mjs and npm run build. With builders idle, run node tools/benchmark-rendering.mjs --batch --runs=5 --label=render-final. Use --batch --checkpoints --label=render-quality for exact-frame route captures and --batch --isolate-frame=90 --label=render-visual-isolate for repeated controls. Capture render-perf-before --all --hardware --legacy-render-perf and render-perf-after --all --hardware with tools/capture-hero-shot.mjs; capture render-perf-motion-after --motion --hardware and render-perf-collisions --collision-audit --hardware too. Run tools/verify-rendering.py, then node tools/report-rendering.mjs. The harness restores original main/scene buffers in finally; never overlap it with another capture or build.', '',
  '[Raw final runs, stage counters, pilots and checks](render-performance-results-2026-10-25.json).', ''
].join('\n');
fs.writeFileSync('docs/design/render-performance-2026-10-25.md',doc);
console.log(JSON.stringify({before:phases.before.p50,after:phases.after.p50,beforeP95:phases.before.p95,afterP95:phases.after.p95,p50Change,p95Change,fasterPairs,gate,collisionChecks:collisions.checks.length},null,2));
if(!gate)process.exitCode=2;
