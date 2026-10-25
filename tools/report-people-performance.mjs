import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/design/screenshots/';
const read=n=>JSON.parse(fs.readFileSync(dir+n+'.json'));
const shots=['hero-street-main','hero-street-material','street-entry'];
const pairs={};
for(const shot of shots){
  const a=read(shot+'-steps56-perf-before'),b=read(shot+'-steps56-perf-after');
  for(const key of ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','groundSection','activeIndices','drawCalls','estimatedTextureMiB','contactPolish','contactShadows','peopleMaterials','textures','vertices'])assert.deepEqual(a[key],b[key],shot+': '+key);
  const roots=r=>[...r].sort((a,b)=>a.name.localeCompare(b.name));
  assert.deepEqual(roots(a.layoutRoots),roots(b.layoutRoots));
  assert.deepEqual(b.textureErrors,[]);
  assert.ok(b.workerInteraction.find(h=>h.hand==='support').targetErrorMeters<.02);
  pairs[shot]={camera:b.camera,drawCalls:b.drawCalls,activeIndices:b.activeIndices,estimatedTextureMiB:b.estimatedTextureMiB,workerInteraction:b.workerInteraction};
}
const median=a=>[...a].sort((a,b)=>a-b)[1];
const performance={};
for(const phase of ['baseline','before','after']){
  const runs=[1,2,3].map(n=>read(`hero-street-main-steps56-perf-extended-${phase}-${n}`));
  for(const r of runs){
    assert.equal(r.frameIntervalsMs.samples,539);assert.equal(r.benchmarkProgress,1);
    assert.deepEqual(r.benchmarkProtocol,{frames:600,warmupFrames:61,deterministicActorTime:true});
    assert.deepEqual(r.textureErrors,[]);assert.deepEqual(r.gpu,runs[0].gpu);
    assert.ok(!/SwiftShader/i.test(r.gpu.renderer));
  }
  performance[phase]={gpu:runs[0].gpu,renderSize:[runs[0].renderWidth,runs[0].renderHeight],p50:median(runs.map(r=>r.frameIntervalsMs.p50)),p95:median(runs.map(r=>r.frameIntervalsMs.p95)),runs:runs.map(r=>r.frameIntervalsMs)};
}
for(const phase of ['baseline','before']){
  assert.deepEqual(performance[phase].gpu,performance.after.gpu);
  assert.deepEqual(performance[phase].renderSize,performance.after.renderSize);
}
performance.vsRegressed={p50:performance.after.p50/performance.before.p50-1,p95:performance.after.p95/performance.before.p95-1};
performance.vsPreSteps56={p50:performance.after.p50/performance.baseline.p50-1,p95:performance.after.p95/performance.baseline.p95-1};
performance.regressionBudgetPassed=performance.vsPreSteps56.p50<=.1&&performance.vsPreSteps56.p95<=.1;
const motionComparisons=[];
for(const run of [1,2,3]){
  const a=read(`hero-street-main-steps56-perf-extended-before-${run}`),b=read(`hero-street-main-steps56-perf-extended-after-${run}`);
  const bones=new Map(b.peoplePoseMatrices.map(n=>[n.name,n.world]));
  let maxDifference=0,elements=0;
  for(const node of a.peoplePoseMatrices){
    const world=bones.get(node.name);assert.ok(world,node.name);
    node.world.forEach((v,i)=>{maxDifference=Math.max(maxDifference,Math.abs(v-world[i]));elements++;});
  }
  assert.ok(maxDifference<1e-6,'Moving pose changed');
  motionComparisons.push({run,elements,maxDifference});
}
const checks=JSON.parse(fs.readFileSync('docs/design/hero-people-performance-image-checks-2026-10-25.json'));
const cpuChecks=JSON.parse(fs.readFileSync('docs/design/hero-people-performance-cpu-checks-2026-10-25.json'));
const collisions=read('hero-street-main-steps56-perf-collisions').collisionAudit;
assert.equal(collisions.passed,true);
const movement=read('hero-street-main-steps56-perf-motion-after').motionRecording;
assert.equal(movement.state.complete,true);assert.equal(movement.state.frame,300);
const method='Three runs per variant, nine fresh hardware Chrome sessions; order rotates baseline/before/after, after/baseline/before, before/after/baseline. Balanced 1280×720, same Intel GPU and existing route. Each run renders 600 frames, excludes 61 warm-up frames and measures 539 frame intervals. Camera progress and character animation use the same deterministic frame timeline for every variant. Report the median of run p50/p95. Builders idle; startup excluded, LOD streaming included. Baseline uses original pre-step-5/6 assets and legacy pose/bias; before uses the completed visual improvements and original update code; after uses identical visual assets with optimized code. All temporary benchmark timing hooks, final source and assets restored and hash-verified. Desktop samples, not sustained or headset qualification.';
const results={date:'2026-10-25',performance,pairs,checks,cpuChecks,motionComparisons,collisionChecks:collisions.checks.length,workerCacheTest:{worldMatrixComparisons:444,tests:['repeated inputs','parent translation','parent rotation','target change','reflected roots']},method};
fs.writeFileSync('docs/design/hero-people-performance-results-2026-10-25.json',JSON.stringify(results,null,2)+'\n');
const labels={baseline:'Pre-step-5/6 baseline',before:'Visual improvements, before optimization',after:'Same visual improvements, optimized'};
const doc=[
  '# Hero character performance correction', '',
  '25 October 2026. CPU-only optimization preserves the finished contact shading, garment fit, worker interaction, root positions, walking paths, district layout and cameras. All three fresh before/after stills are pixel-identical. No resolution, quality, shadow bias, material, LOD or animation-rate reduction.', '',
  '## Changes', '',
  '- Index rig nodes once instead of repeatedly scanning the node array. Copy reset quaternions into existing objects rather than allocating new ones.',
  '- Reuse the exact current world transform and already-refreshed parent matrix inside the IK orientation helper. A forced child update already traverses its ancestors, so rebuilding that chain again for translation and parent inversion is redundant. The two-bone solve, contact targets, roll and timing math are unchanged.',
  '- Set the fixed carrier finger curl and worker hammer grip once. Their local rotations are constant; parent animation continues to move the hands normally.',
  '- Reuse the supporting wrist rotation only when every input world-matrix element and the stone position match exactly. Any input change runs the original solve again. No positional rounding or update throttling.',
  '- Evaluate worker-interaction diagnostics on demand for the QA snapshot. Previously they forced extra world-matrix traversals, rig lookups and diagnostic allocations for both hands on every frame. The pose still updates every frame.', '',
  'A CPU sample of the original route showed matrix/IK work dominating the character path and little sampled cost in the new shadow callbacks. Sampling included startup and is diagnostic evidence, not a GPU timing measurement or a precise causal allocation of the earlier regression. The shadow implementation is unchanged.', '',
  `The reference hand-finish test counts ${cpuChecks.before.forced} forced world-matrix calls before and ${cpuChecks.after.forced} after, a ${(cpuChecks.forcedCallReduction*100).toFixed(1)}% reduction in that tested operation. This includes removal of per-frame diagnostic work and excludes test setup/comparison queries. It is an operation-count improvement, not a measured browser-frame speed-up.`, '',
  '## Matched visual evidence', '',
  '| Locked view | Before optimization | After optimization |','| --- | --- | --- |',
  ...shots.map(s=>`| ${s} | [Before](screenshots/${s}-steps56-perf-before.png) | [After](screenshots/${s}-steps56-perf-after.png) |`),'',
  'All three use the same 1280×720 balanced camera and frozen two-second animation state. RGB comparison: zero changed pixels for every pair. Reconstructed old-code controls also match all three before images exactly. Camera, root, original animation-group, render setting, surface/contact-shadow metadata, geometry count, draw count and texture-storage comparisons pass.', '',
  '[Optimized movement preview](screenshots/hero-street-main-steps56-perf-motion-after.motion.webp) · [Original improved-version movement](screenshots/hero-street-main-steps56-motion-after.motion.webp). Same ten-second/300-step route; sampled compositor previews are not frame-exact comparisons or FPS measurements.', '',
  '## Performance', '',
  `GPU: ${performance.after.gpu.renderer}.`, '',
  '| Variant | Median run p50 | Median run p95 |','| --- | --- | --- |',
  ...['baseline','before','after'].map(p=>`| ${labels[p]} | ${performance[p].p50.toFixed(1)} ms | ${performance[p].p95.toFixed(1)} ms |`),'',
  method, '',
  `Compared with the regressed version: p50 ${(performance.vsRegressed.p50*100).toFixed(1)}%, p95 ${(performance.vsRegressed.p95*100).toFixed(1)}%. Compared with the pre-step-5/6 baseline: p50 ${(performance.vsPreSteps56.p50*100).toFixed(1)}%, p95 ${(performance.vsPreSteps56.p95*100).toFixed(1)}%. Ten-percent regression budget against that baseline: **${performance.regressionBudgetPassed?'PASS':'FAIL'}**.`, '',
  'Interpretation: the defined pre-step baseline budget passes, and the CPU-operation reduction is verified. The optimized wall-clock frame times did not improve on the same-session regressed control. Do not claim a demonstrated FPS speed-up or that every source of the earlier timing regression has been isolated. Hardware/browser/background-load variation and frame stalls remain material limitations.', '',
  'The old 24.2 → 27.4 ms result remains historical evidence in the step-5/6 report. The first new nine-run short set was also noisy and did not show an improvement: [all initial short samples](hero-people-performance-short-runs-2026-10-25.json) are retained. The harness originally advanced the camera by frame count while actors used wall time. The final protocol uses longer sweeps, a longer warm-up and identical simulated actor time, applied equally to every variant. It does not lower production animation rate or change paths/camera bookmarks. An [intermediate longer set](hero-people-performance-initial-extended-2026-10-25.json), before the final IK matrix-read optimization and same-frame cache correction, is retained too; it passed the baseline budget but did not improve on its same-session regressed control. Use the final three-way set below for the completed revision. Timing varies between runs; these tests cannot establish sustained framerate, headset readiness, or recovery of the earlier, separate character-material regression.', '',
  '## Validation and reproduction', '',
  `Production build and content/history/asset-budget/scene locks pass. A NullEngine regression test compares the optimized support/grip solve with the reconstructed original over repeated and changed inputs, including reflected roots: 444 world-matrix comparisons pass within 1e-6. The synchronized moving browser snapshots compare ${motionComparisons.reduce((s,c)=>s+c.elements,0)} joint-matrix elements with maximum difference ${Math.max(...motionComparisons.map(c=>c.maxDifference))}. All ${results.collisionChecks} live collision checks pass, including the Ptah floor and both village approaches. The completed ten-second movement preview exercises the unchanged route and foot solver.`, '',
  'The explicit source delta is content/scene-data/hero-people.performance-revision.json. The character validator checks current source hashes, reverses only that delta, then applies the earlier material/worker exceptions to verify the original avatar-code hash. The IK helper delta reconstructs the original protected GroundContactIK.ts hash. Existing body/rig/material/garment and 71-file scene locks remain active. HumanContactShadows.ts, visual assets and camera/path data are unchanged by this correction.', '',
  'Run node tools/test-worker-pose-cache.mjs, npm run build, then—after builders stop—node tools/benchmark-people-performance.mjs --control and node tools/benchmark-people-performance.mjs --extended. The three-way benchmark needs content/generated/steps56-before for original visual assets. Original CPU code is reconstructed from the checked-in source delta; final files and temporary timing hooks are restored in finally. Never overlap source/asset swapping with builds or another capture.', '',
  'Capture steps56-perf-after --all --hardware, steps56-perf-motion-after --motion --hardware and steps56-perf-collisions --collision-audit --hardware with tools/capture-hero-shot.mjs. Then run tools/verify-people-performance.py and node tools/report-people-performance.mjs. --profile saves diagnostic CPU samples under ignored content/generated/performance-profiles. No external character assets were introduced.', '',
  '[Raw timing runs and checks](hero-people-performance-results-2026-10-25.json).', ''
].join('\n');
fs.writeFileSync('docs/design/hero-people-performance-2026-10-25.md',doc);
console.log(JSON.stringify({performance,collisionChecks:results.collisionChecks},null,2));
