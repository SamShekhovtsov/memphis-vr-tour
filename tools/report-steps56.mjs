import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/design/screenshots/';
const read=n=>JSON.parse(fs.readFileSync(dir+n+'.json'));
const shots=['hero-street-main','hero-street-material','street-entry'];
const pairs={};
for(const shot of shots){
  const a=read(shot+'-steps56-before'),b=read(shot+'-steps56-after');
  for(const key of ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','groundSection','activeIndices','drawCalls'])
    assert.deepEqual(a[key],b[key],shot+': '+key);
  const roots=r=>[...r].sort((a,b)=>a.name.localeCompare(b.name));
  assert.deepEqual(roots(a.layoutRoots),roots(b.layoutRoots));
  assert.deepEqual(b.textureErrors,[]);
  assert.equal(b.estimatedTextureMiB,a.estimatedTextureMiB);
  assert.ok(b.peopleMaterials.bindings.filter(v=>v.family==='skin').every(v=>!v.alphaTest));
  assert.equal(b.contactShadows.extraPasses,0);
  assert.equal(b.contactShadows.staticNormalBias,.035);
  assert.equal(b.contactShadows.humanNormalBias,.012);
  const support=b.workerInteraction.find(v=>v.hand==='support');
  assert.ok(support.targetErrorMeters<.02);
  pairs[shot]={camera:b.camera,drawCalls:b.drawCalls,activeIndices:b.activeIndices,estimatedTextureMiB:b.estimatedTextureMiB,workerInteraction:b.workerInteraction};
}
const median=a=>a.sort((a,b)=>a-b)[1];
const performance={};
for(const phase of ['before','after']){
  const runs=[1,2,3].map(n=>read(`hero-street-main-steps56-benchmark-${phase}-${n}`));
  for(const r of runs){
    assert.equal(r.frameIntervalsMs.samples,169);assert.equal(r.benchmarkProgress,1);
    assert.deepEqual(r.textureErrors,[]);assert.deepEqual(r.gpu,runs[0].gpu);
    assert.ok(!/SwiftShader/i.test(r.gpu.renderer));
  }
  performance[phase]={gpu:runs[0].gpu,renderSize:[runs[0].renderWidth,runs[0].renderHeight],p50:median(runs.map(r=>r.frameIntervalsMs.p50)),p95:median(runs.map(r=>r.frameIntervalsMs.p95)),runs:runs.map(r=>r.frameIntervalsMs)};
}
assert.deepEqual(performance.before.gpu,performance.after.gpu);
assert.deepEqual(performance.before.renderSize,performance.after.renderSize);
performance.p50Change=performance.after.p50/performance.before.p50-1;
performance.p95Change=performance.after.p95/performance.before.p95-1;
performance.regressionBudgetPassed=performance.p50Change<=.1&&performance.p95Change<=.1;
const collisions=read('hero-street-main-steps56-collisions').collisionAudit;
assert.equal(collisions.passed,true);
for(const phase of ['before','after']){
  const m=read('hero-street-main-steps56-motion-'+phase).motionRecording;
  assert.equal(m.state.complete,true);assert.equal(m.state.frame,300);
}
const checks=JSON.parse(fs.readFileSync('docs/design/hero-steps56-contact-checks-2026-10-25.json'));
const results={date:'2026-10-25',pairs,performance,checks,collisionChecks:collisions.checks.length,
  method:'Three alternating before/after route sweeps with archived original assets and a legacy switch for procedural changes. Same Intel GPU, balanced 1280x720; 180 rendered frames and 169 timed intervals per run. Median of the three run p50/p95 values. Builders idle. Initial load excluded; streaming included. Short desktop measurements, not sustained or headset qualification.'};
fs.writeFileSync('docs/design/hero-steps56-results-2026-10-25.json',JSON.stringify(results,null,2)+'\n');
const doc=[
  '# Hero street: steps 5 and 6', '',
  '25 October 2026. Contact-shadow polish and upgrades to the existing characters. District layout, character root positions, walking paths and the three camera bookmarks remain locked. This is an incremental improvement; the reference-level human and environment quality remains a larger art-production task.', '',
  '## Step 5 — contact shadows', '',
  'Baked short-range static ambient occlusion (0.4 m distance, 1024² source) into the existing UV1 indirect-light maps, with gentle filtering and a maximum 18% attenuation of indirect light. Direct sunlight and albedo are unchanged. Moving actors are excluded from the bake. Existing 2048² PNG sources and lossless WebP delivery are retained; no extra runtime textures, geometry, draws or render passes.', '',
  'People use a closer shadow-caster bias in the existing shadow pass (depth 0.00025, normal 0.012). Architecture retains its original 0.0005 / 0.035 bias. Lowering the global bias produced striping in a trial and was rejected. This is bias refinement, not a new screen-space contact-shadow effect; limited shadow-map resolution remains visible.', '',
  '## Step 6 — existing characters', '',
  'Refitted the existing linen wraps with up to 36 mm side clearance and 70 mm front/back clearance. Reweighted the same garment vertices to follow the upper legs and smoothly blend to lower legs at long hems. Normals are rebuilt; indices, UVs, material attributes, body geometry, skin definitions and skeletons are preserved. No extra geometry or asset bytes. Skin now uses an opaque material instead of the previous coverage alpha test. The old coverage data remains available only for legacy QA.', '',
  'The stationary stone worker now bends toward the existing block, lowers the torso while keeping the feet planted, places the support wrist 25 mm above the stone, orients the hand toward it and curls the hammer fingers. Root, block and feet positions stay fixed. This intentionally changes the worker’s procedural upper-body pose; walking animation, root tracks and foot-contact solver remain protected. It is a kinematic interaction, not cloth or finger-contact simulation.', '',
  '## Matched captures', '',
  'All three still pairs use the locked 1280×720 balanced view and the same frozen two-second animation time. Original assets plus the legacy switch reproduce all three before screenshots pixel for pixel.', '',
  '| View | Before | After |','| --- | --- | --- |',
  ...shots.map(s=>`| ${s} | [Before](screenshots/${s}-steps56-before.png) | [After](screenshots/${s}-steps56-after.png) |`),'',
  '[Before movement](screenshots/hero-street-main-steps56-motion-before.motion.webp) · [After movement](screenshots/hero-street-main-steps56-motion-after.motion.webp). The previews use the same 300-step/ten-second simulation. Sampled browser compositor frames are illustrative playback, not measured game FPS or frame-exact image pairs.', '',
  '## Performance and checks', '',
  `GPU: ${performance.after.gpu.renderer}.`, '',
  '| Balanced route | Median run p50 | Median run p95 |','| --- | --- | --- |',
  ...['before','after'].map(p=>`| ${p} | ${performance[p].p50.toFixed(1)} ms | ${performance[p].p95.toFixed(1)} ms |`),'',
  results.method, '',
  `Changes: p50 ${(performance.p50Change*100).toFixed(1)}%, p95 ${(performance.p95Change*100).toFixed(1)}%. Ten-percent regression budget: **${performance.regressionBudgetPassed?'PASS':'FAIL'}**. These compare against the immediate pre-step-5/6 material version; they do not establish recovery of the earlier material-pass regression.`, '',
  `Main still: ${pairs['hero-street-main'].drawCalls} draw calls; ${pairs['hero-street-main'].activeIndices} active indices; ${pairs['hero-street-main'].estimatedTextureMiB.toFixed(1)} MiB estimated texture storage, unchanged. People GLBs total 3,989,432 bytes, unchanged. Lightmap delivery grew by 12,302 bytes. All ${results.collisionChecks} live collision checks pass, including Ptah floors and both village approaches. Production build, content/history/budget validators and body/rig/layout/route/camera locks pass.`, '',
  '[Raw measurements and interaction diagnostics](hero-steps56-results-2026-10-25.json). Short runs still contain stalls and do not demonstrate VR-ready performance. Cinematic and headset tiers, Unity and Unreal were not qualified.', '',
  '## Reproduce and transfer', '',
  'The explicit revision is content/scene-data/hero-street.steps56-revision.json. Validation reconstructs the original body and garment binary prefix, allowing only four declared garment streams, and reverses the declared worker/shadow source edits to check the original code hashes. Source provenance remains in content/source-assets/characters/PROVENANCE.md; the new garment recipe and shadow bake are project-authored.', '',
  'Rebuild contacts with Blender tools/blender/bake_hero_contacts.py, then Python tools/apply-hero-contacts.py. It uses the saved bake scene when available, otherwise imports the current high street GLBs with existing UV1. Original indirect maps are checked in at content/source-assets/lighting/hero-contact-base/. Refit with tools/fit-hero-clothing.py --refresh; original streams are retained in hero-fit-baseline.bin. tools/build-character-materials.py --from-current also reapplies the fit after material generation.', '',
  'With the before archive present and builders idle: node tools/benchmark-steps56.mjs --control; capture steps56-after --all --hardware and steps56-motion-after --motion --hardware; node tools/benchmark-steps56.mjs; capture steps56-collisions --collision-audit --hardware; run tools/verify-steps56-contacts.py and node tools/report-steps56.mjs. Capture commands use tools/capture-hero-shot.mjs. The benchmark restores final assets in finally; never overlap it with builds or another capture.', '',
  'The fitted GLBs and ordinary UV1 indirect maps remain portable. Engine adapters must use opaque skin with linear vertex RGB, preserve fitted garment weights, bind indirect irradiance once, and reproduce the worker’s kinematic targets in their own animation system. Browser caster-bias values are renderer-specific. Natural facial detail, eyes, hair silhouettes, hand anatomy and physically simulated linen remain limitations; these changes do not replace the existing people with scan-quality assets.', ''
].join('\n');
fs.writeFileSync('docs/design/hero-street-steps-5-6-2026-10-25.md',doc);
console.log(JSON.stringify({performance,collisionChecks:results.collisionChecks},null,2));
