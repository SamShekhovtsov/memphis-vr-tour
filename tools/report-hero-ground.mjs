import fs from 'node:fs';
import assert from 'node:assert/strict';
const folder = 'docs/design/screenshots/';
const read = name => JSON.parse(fs.readFileSync(folder + name + '.json'));
const contract = JSON.parse(fs.readFileSync('content/scene-data/hero-street.acceptance.json'));
const manifest = JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/hero-ground/manifest.json'));
const anchors = JSON.parse(fs.readFileSync('content/scene-data/hero-street.anchors-lock.json'));
const protectedData = JSON.parse(fs.readFileSync('content/scene-data/hero-street.section-lock.json'));
const shots = ['hero-street-main','street-entry','hero-street-material'];
const pairs = {};
const sortedRoots = roots => [...roots].sort((a,b)=>a.name.localeCompare(b.name));
for (const shot of shots) {
  const before = read(shot+'-ground12-before'), after = read(shot+'-ground12-after');
  for (const key of ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','activeIndices']) {
    assert.deepEqual(before[key],after[key],`${shot}: unmatched ${key}`);
  }
  assert.deepEqual(sortedRoots(before.layoutRoots),sortedRoots(after.layoutRoots),`${shot}: layout roots changed`);
  assert.equal(before.groundSection,null);
  assert.equal(after.groundSection?.id,manifest.id);
  assert.equal(after.groundContacts.length,6);
  assert.deepEqual(after.textureErrors,[]);
  assert.ok(after.streetLods.every(lod=>!lod.failed.length));
  const textureMiB = after.estimatedTextureMiB-before.estimatedTextureMiB;
  assert.ok(textureMiB<=contract.budgets.additionalTextureMiB);
  assert.ok(after.drawCalls-before.drawCalls<=contract.budgets.additionalDrawCalls);
  pairs[shot] = {camera:after.camera,drawCalls:{before:before.drawCalls,after:after.drawCalls},additionalTextureMiB:textureMiB,activeIndices:after.activeIndices};
}
const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const runs = {};
let gpu;
for (const phase of ['before','after']) {
  const samples = [1,2,3].map(index=>read(`hero-street-main-ground12-benchmark-${phase}-${index}`));
  for (const sample of samples) {
    assert.equal(sample.benchmarkProgress,1);
    assert.equal(sample.frameIntervalsMs.samples,169);
    assert.deepEqual(sample.textureErrors,[]);
    assert.ok(sample.streetLods.every(lod=>!lod.failed.length));
    assert.ok(!/SwiftShader/i.test(sample.gpu.renderer));
    if (gpu) assert.deepEqual(sample.gpu,gpu);
    else gpu=sample.gpu;
  }
  const p50 = median(samples.map(sample=>sample.frameIntervalsMs.p50));
  runs[phase] = {p50,p95:median(samples.map(sample=>sample.frameIntervalsMs.p95)),medianEquivalentFps:1000/p50,
    samples:samples.map(sample=>sample.frameIntervalsMs),renderSize:[samples[0].renderWidth,samples[0].renderHeight]};
}
assert.deepEqual(runs.before.renderSize,runs.after.renderSize);
const performance = {
  medianRegression:runs.after.p50/runs.before.p50-1,
  p95Regression:runs.after.p95/runs.before.p95-1,
};
performance.passed = performance.medianRegression<=contract.budgets.maximumMedianFrameRegression
  && performance.p95Regression<=contract.budgets.maximumP95FrameRegression;
const clips = {};
for (const phase of ['before','after']) {
  const clip = read(`hero-street-main-ground12-motion-${phase}`).motionRecording;
  assert.equal(clip.state.frame,300); assert.equal(clip.state.complete,true);
  assert.deepEqual(clip.state.start,contract.motion.start); assert.deepEqual(clip.state.end,contract.motion.end);
  assert.equal(clip.simulationSeconds,10); assert.ok(clip.encodedFrames>=20);
  assert.ok(fs.statSync(folder+`hero-street-main-ground12-motion-${phase}.motion.webp`).size>10000);
  clips[phase] = clip;
}
const collisions = read('hero-street-main-ground12-collisions').collisionAudit;
assert.equal(collisions.passed,true);
const channels = JSON.parse(fs.readFileSync('docs/design/hero-ground-channel-checks-2026-10-24.json'));
const report = {date:contract.date,gpu,contract:contract.id,pairs,runs,performance,clips,
  protectedFiles:Object.keys(protectedData.protectedFiles).length,protectedFunctions:Object.keys(protectedData.protectedCode).length,
  sourceAnchors:anchors.anchors.length,protectedDoorAndMassExtents:anchors.anchors.filter(anchor=>anchor.bounds).length,
  groundRuntimeBytes:Object.values(manifest.runtime).reduce((sum,entry)=>sum+entry.bytes,0),
  collisionChecks:collisions.checks.length,channels,
  method:'Three alternating before/after accelerated 180-rendered-frame route sweeps, 169 intervals each; report median of the three p50 and p95 results. Same GPU, balanced tier, 1280x720. Initial load excluded; LOD streaming included. No concurrent asset builds or recording. Short desktop tests, not sustained/headset validation.'};
fs.writeFileSync('docs/design/hero-ground-results-2026-10-24.json',JSON.stringify(report,null,2)+'\n');
const comparisonRows = shots.map(shot=>`| ${shot} | [Before](screenshots/${shot}-ground12-before.png) | [After](screenshots/${shot}-ground12-after.png) |`);
const performanceRows = Object.entries(runs).map(([phase,data])=>`| ${phase} | ${data.p50.toFixed(1)} ms | ${data.p95.toFixed(1)} ms | ${data.medianEquivalentFps.toFixed(1)} |`);
const document = [
  '# Hero street steps 1–2: acceptance baseline and ground section', '',
  '## Step 1: comparison and protection', '',
  `${report.sourceAnchors} source-object origins are locked, including ${report.protectedDoorAndMassExtents} protected house-mass/door marker extents. ${report.protectedFiles} geometry, route, camera, motion and lighting files are byte-locked; ${report.protectedFunctions} placement, camera and collision functions are checked against the original implementation. The source anchors are regenerated in memory for verification without exporting any geometry.`, '',
  '[Acceptance criteria and initial budgets](../../content/scene-data/hero-street.acceptance.json) specify the existing 1280×720 balanced bookmarks, frozen time of two seconds, no new geometry/draw calls, at most 6 MB of extra runtime maps, at most 36 MiB of estimated additional texture storage, and at most 10% regression in the median-of-three p50/p95 results.', '',
  'The three canonical views, actor clip frames, root transforms, active index counts and lighting settings match between the two versions. Geometry bytes and walking-surface heights are unchanged.', '',
  '## Step 2: bounded physical ground material', '',
  'The section covers x=-10.7..-1.55 and z=-22..-4 metres. It blends into the retained ground over 0.35 m at its sides and 1.5 m at its ends. It uses the original ground mesh and irradiance, with no additional transparent plane or displacement.', '',
  'The soil detail comes from [Brown Mud Dry by Rob Tuytel](https://polyhaven.com/a/brown_mud_dry), under [CC0](https://polyhaven.com/license). Downloads were hash-verified. It is generic physical reference, not archaeological evidence for this specific street. The earlier dirt candidate was rejected for modern-looking debris and is not shipped.', '',
  'A deterministic spatial blend varies four orientations of the 1.3 m source. Project-authored masks control lane compaction, edge/low-prop dust deposits, disturbed soil and sparse shallow bare-foot impressions. Normal relief is derived from the aligned height data in millimetres; it never modifies geometry or collision. Existing physical lighting and baked contacts remain separate from albedo.', '',
  'Runtime maps are 2048² colour/blend alpha and 1024² normal/ORM. Albedo uses quality-92 WebP with exact blend alpha; physical channels use byte-verified lossless WebP. Editable RGBA masks, full-quality PNGs and a 16-bit height source are retained in content/source-assets/ground/hero-section-generated/. The fourth mask channel is data, not transparency, and is resized independently.', '',
  `Additional download: ${(report.groundRuntimeBytes/1e6).toFixed(2)} MB. Estimated additional RGBA8+mipmap storage: ${pairs['hero-street-main'].additionalTextureMiB.toFixed(1)} MiB. Additional main-view draw calls: ${pairs['hero-street-main'].drawCalls.after-pairs['hero-street-main'].drawCalls.before}. These are texture-storage estimates, not measured total GPU VRAM.`, '',
  '## Matched views', '',
  '| View | Before | After |','| --- | --- | --- |',...comparisonRows,'',
  '[Before route preview](screenshots/hero-street-main-ground12-motion-before.motion.webp) · [After route preview](screenshots/hero-street-main-ground12-motion-after.motion.webp).', '',
  `Both previews follow the existing x=-6, z=-18..-4 segment on a 300-step, 30 Hz simulation clock. Recorded compositor frames are assigned to that clock and encoded as approximately ten-second animated WebP previews (${clips.before.encodedFrames}/${clips.after.encodedFrames} captured frames). Sampling and encoding can omit frames; previews are not game-FPS measurements. The browser video encoder was unreliable on the test GPU, so the recorder uses compositor captures instead.`, '',
  '## Performance', '', `GPU: ${gpu.renderer}.`, '',
  '| Balanced route | Median run p50 | Median run p95 | Median-equivalent FPS |','| --- | --- | --- | --- |',...performanceRows,'',
  report.method, '',
  `Timing varied: baseline run medians ranged ${Math.min(...runs.before.samples.map(sample=>sample.p50)).toFixed(1)}–${Math.max(...runs.before.samples.map(sample=>sample.p50)).toFixed(1)} ms; updated run medians ranged ${Math.min(...runs.after.samples.map(sample=>sample.p50)).toFixed(1)}–${Math.max(...runs.after.samples.map(sample=>sample.p50)).toFixed(1)} ms. One updated run had a ${Math.max(...runs.after.samples.map(sample=>sample.p95)).toFixed(1)} ms p95. The aggregate budget passes, but these noisy measurements do not establish a speed-up; frame-time spikes remain. Every run is retained in the raw report.`, '',
  `Initial performance budget: **${performance.passed?'PASS':'FAIL'}**. Median change ${(performance.medianRegression*100).toFixed(1)}%; p95 change ${(performance.p95Regression*100).toFixed(1)}%. All ${report.collisionChecks} live collision checks pass, including the Ptah floors and both approach crossings.`, '',
  '[Machine-readable results](hero-ground-results-2026-10-24.json) · [PBR/channel and protected-region checks](hero-ground-channel-checks-2026-10-24.json).', '',
  '## Verification and reproduction', '',
  'Run npm run validate:hero-section and npm run validate:hero-anchors. Build the material with tools/build-hero-ground.py using Python/Pillow/NumPy; verify delivered channels and the matched captures with tools/verify-hero-ground.py. Normal/ORM bytes, blend alpha, unit normals, nonmetallic rough soil and all four editable masks are verified independently. Protected canopy/sky pixels and roof surface interiors match. Small antialiased roof-edge differences are excluded with a two-pixel edge guard and reported separately; exact geometry/camera/light locks also pass.', '',
  'The browser production build and existing hero, actor/people, content, historical and optimization validators passed. Root builds now include the section validator, and the optimization validator counts the additional ground downloads explicitly.', '',
  'The geometry byte locks belong to the steps 1–2 baseline. Later authorized geometry refinements need deliberate revision of the affected byte hashes after anchor and visual verification; construction placements, camera and route locks remain protected.', '',
  'Capture ground12-before with --all --hardware --legacy-ground, ground12-after with --all --hardware, and ground12-motion-before/after with --motion (add --legacy-ground for before). Capture ground12-collisions with --collision-audit --hardware. Capture three paired ground12-benchmark-before-N/after-N route runs with --benchmark --hardware, adding --legacy-ground for before. Run node tools/report-hero-ground.mjs. The recorder requires Python/Pillow; set PYTHON_BIN if it is not on PATH or in the Codex bundled runtime.', '',
  'The GLB and PBR sources remain available for future Unity/Unreal use. The bounded world-space material binding is currently tested in browser WebGL; other engine bindings and physical headset performance are not claimed.', '',
  '## Remaining visual work', '',
  'This is the ground/validation milestone. It leaves the existing façades, cloth, props, people and lighting in place. Their further asset-quality work remains necessary to approach the supplied cinematic references; channel and budget checks do not automatically certify that visual standard.', '',
].join('\n');
fs.writeFileSync('docs/design/hero-ground-steps-1-2-2026-10-24.md',document);
console.log(JSON.stringify({runs,performance,additionalGroundBytes:report.groundRuntimeBytes,additionalTextureMiB:pairs['hero-street-main'].additionalTextureMiB,collisionChecks:report.collisionChecks},null,2));
if (!performance.passed) process.exitCode=1;
