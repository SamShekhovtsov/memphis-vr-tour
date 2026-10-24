import fs from 'node:fs';
import assert from 'node:assert/strict';
const folder = 'docs/design/screenshots/';
const read = name => JSON.parse(fs.readFileSync(folder+name+'.json'));
const old = JSON.parse(fs.readFileSync('content/generated/surfaces34-before/hero-street/manifest.json'));
const current = JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/hero-street/manifest.json'));
const pairs = {};
const budget = JSON.parse(fs.readFileSync('content/scene-data/hero-street.steps34-acceptance.json')).budgets;
const sort = roots => [...roots].sort((a,b)=>a.name.localeCompare(b.name));
for (const shot of ['hero-street-main','hero-street-material','street-entry']) {
  const a = read(shot+'-surfaces34-before'), b = read(shot+'-surfaces34-after');
  for (const key of ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','groundSection'])
    assert.deepEqual(a[key],b[key],`${shot}: unmatched ${key}`);
  assert.deepEqual(sort(a.layoutRoots),sort(b.layoutRoots),'Layout moved');
  assert.deepEqual(b.textureErrors,[]);
  assert.ok(b.streetLods.every(lod=>!lod.failed.length));
  pairs[shot] = {camera:b.camera,drawCalls:{before:a.drawCalls,after:b.drawCalls},
    textureMiB:{before:a.estimatedTextureMiB,after:b.estimatedTextureMiB},
    activeIndices:{before:a.activeIndices,after:b.activeIndices}};
  assert.ok(b.estimatedTextureMiB-a.estimatedTextureMiB <= budget.additionalTextureMiB,'Finish texture storage exceeds budget');
  assert.ok(b.drawCalls-a.drawCalls <= budget.additionalDrawCalls,'Finish draw calls exceed budget');
}
const performance = {};
const median = values => [...values].sort((a,b)=>a-b)[1];
for (const phase of ['before','after']) {
  const samples = [1,2,3].map(index=>read(`hero-street-main-surfaces34-benchmark-${phase}-${index}`));
  for (const sample of samples) {
    assert.equal(sample.benchmarkProgress,1);
    assert.equal(sample.frameIntervalsMs.samples,169);
    assert.ok(!/SwiftShader/i.test(sample.gpu.renderer));
    assert.deepEqual(sample.textureErrors,[]);
    assert.deepEqual(sample.gpu,samples[0].gpu);
  }
  performance[phase] = {gpu:samples[0].gpu,renderSize:[samples[0].renderWidth,samples[0].renderHeight],
    p50:median(samples.map(s=>s.frameIntervalsMs.p50)),p95:median(samples.map(s=>s.frameIntervalsMs.p95)),
    runs:samples.map(s=>s.frameIntervalsMs)};
}
assert.deepEqual(performance.before.gpu,performance.after.gpu);
assert.deepEqual(performance.before.renderSize,performance.after.renderSize);
performance.p50Change = performance.after.p50/performance.before.p50-1;
performance.p95Change = performance.after.p95/performance.before.p95-1;
performance.budgetPassed = performance.p50Change <= budget.maximumMedianFrameRegression && performance.p95Change <= budget.maximumP95FrameRegression;
const collisions = read('hero-street-main-surfaces34-collisions').collisionAudit;
assert.equal(collisions.passed,true);
for (const phase of ['before','after']) {
  const motion = read('hero-street-main-surfaces34-motion-'+phase).motionRecording;
  assert.equal(motion.state.complete,true);
  assert.equal(motion.state.frame,300);
}
const triangles = m => m.assets.reduce((s,a)=>s+a.triangles,0);
const report = {date:'2026-10-24',completedDate:'2026-10-25',pairs,performance,triangles:{before:triangles(old),after:triangles(current)},
  deliveryBytes:{before:old.deliveryCompression.deliveryBytes,after:current.deliveryCompression.deliveryBytes},
  collisionChecks:collisions.checks.length,
  method:'Three alternating archived-before/final-after accelerated route comparisons, each 180 rendered frames and 169 timed intervals, balanced 1280×720 on the same hardware GPU. Median of run p50 and run p95. Initial load excluded; LOD streaming included. No simultaneous asset builds. Short samples; not sustained performance or headset qualification.'};
fs.writeFileSync('docs/design/hero-finish-results-2026-10-24.json',JSON.stringify(report,null,2)+'\n');
const shots = Object.keys(pairs);
const main = pairs['hero-street-main'];
const rows = shots.map(shot=>`| ${shot} | [Before](screenshots/${shot}-surfaces34-before.png) | [After](screenshots/${shot}-surfaces34-after.png) |`);
const document = [
  '# Hero street steps 3–4: foreground finishes', '',
  'Started 24 October 2026; completed 25 October 2026.', '',
  'This is an incremental surface and cloth improvement on the locked street. The matched views still show a substantial gap to the supplied cinematic references, especially in character shading, architectural repetition and the broad daylight/sky treatment. Passing technical checks does not establish reference-level realism.', '',
  '## Implemented', '',
  'The two foreground street-facing plaster finishes receive additional interior tessellation, at most 7 mm of inward surface relief, and unique low-wall wear/repair variation in opaque vertex colours. Foreground wall, jamb and roof-trim hard edges are rounded inward with a 35 mm/four-segment bevel, compared with the retained 18 mm treatment elsewhere. Existing surface vertices stay fixed during the shallow-relief operation; the edge treatment refines corner vertices inside the construction envelope. House masses and door marker extents stay fixed. New 1024² plaster albedo, tangent normal and ORM maps use broad hand-applied variation and millimetre-scale trowel relief over a two-metre tile. No new exposed brick grid or architectural features were added.', '',
  'The existing foreground canopy and awnings use broad hanging bellies and corner-local folds rather than equally strong repeated ripples. Additional central sag is up to 24 cm for the large canopy and 12 cm for small awnings; the previous thickness and raised hems remain. Existing corner positions are the support frame. A separate 1024² linen family represents approximately 1.6 mm threads over a half-metre tile, with restrained normal strength and the existing translucency setting.', '',
  'Nearby existing timber receives 3 mm edge rounding and pottery lips receive a 7 mm/three-segment bevel instead of the previous 4 mm/two-segment treatment. Both receive subtle spatial wear in vertex colour, retaining the existing thrown-clay curvature and bent timber. Canopy hems now extend along all four edges. This pass does not replace these props or add new objects. Roof extents, door openings, prop centres and route clearances are retained. The finish scope is Blender source Y=10.5..19.2 m, with facade X bands restricting plaster relief/material work to the lane-facing surfaces.', '',
  'Cycles irradiance was rebaked for the final cloth/surface geometry at the existing 2048²/48-sample settings, then filtered and losslessly compressed. The sun, exposure, fog, camera settings and the bounded ground material are unchanged. Irradiance still excludes surface albedo and direct sun. Wear colours are applied by the runtime material, not painted into the irradiance.', '',
  '## Protection and delivery', '',
  'The in-memory audit verified all 1,713 source anchors and 70 protected building/door extents. Original source street GLBs, actor motion, district placement, cameras and routes retain their steps 1–2 hashes. The nine deliberately revised authored high/LOD GLBs have explicit before/after hashes in hero-street.steps34-revision.json; the original lock file is retained. Eight placement/camera/collision function hashes remain unchanged.', '',
  `High-detail triangles: ${report.triangles.before.toLocaleString()} → ${report.triangles.after.toLocaleString()}. Street texture delivery: ${(report.deliveryBytes.before/1e6).toFixed(2)} → ${(report.deliveryBytes.after/1e6).toFixed(2)} MB. Main-view draws: ${main.drawCalls.before} → ${main.drawCalls.after}. Estimated texture storage: ${main.textureMiB.before.toFixed(1)} → ${main.textureMiB.after.toFixed(1)} MiB, including mipmaps; this is not measured total GPU VRAM. Existing 14 MB high-geometry, 16 MB streamed-LOD and 12 MB street-texture budgets pass. The separately budgeted ground remains 4.39 MB.`, '',
  'Duplicate finish material slots are merged. Wear colours use standard normalized linear RGBA8 COLOR_0 rather than full-precision floats. Other vertex attributes and index payloads are retained by the colour packer. Every high and LOD primitive is checked for retained colour/irradiance channels; high-mesh alpha values are checked to remain fully opaque.', '',
  'The GLBs and ordinary PBR maps remain portable source assets. Unity/Unreal materials must multiply the base colour by linear vertex colour, read roughness from ORM green, use the declared tangent-normal convention, and bind UV1 irradiance separately. Those engine integrations and physical headset performance have not been tested.', '',
  '## Matched captures', '',
  '| View | Before | After |','| --- | --- | --- |',...rows,'',
  '[Before route preview](screenshots/hero-street-main-surfaces34-motion-before.motion.webp) · [After route preview](screenshots/hero-street-main-surfaces34-motion-after.motion.webp).', '',
  'Static comparisons use the same three bookmarks, 1280×720 balanced tier, two-second animation time, layout roots and lighting. Route previews follow the same 300-step, ten-second review segment. Compositor sampling can omit frames; these previews are not FPS measurements.', '',
  '## Performance', '',
  `GPU: ${performance.after.gpu.renderer}.`, '',
  '| Route comparison | Median run p50 | Median run p95 |','| --- | --- | --- |',
  ...['before','after'].map(phase=>`| ${phase} | ${performance[phase].p50.toFixed(1)} ms | ${performance[phase].p95.toFixed(1)} ms |`),'',
  report.method, '',
  `The 10% aggregate regression budget ${performance.budgetPassed?'passes':'fails'}: p50 change ${(performance.p50Change*100).toFixed(1)}%, p95 change ${(performance.p95Change*100).toFixed(1)}%. Timing is noisy on this older GPU; these short measurements do not establish a speed-up. Raw results retain every run. All ${report.collisionChecks} live collision checks pass, including the Ptah floors and both approach crossings.`, '',
  '[Raw results](hero-finish-results-2026-10-24.json) · [Step 3–4 acceptance/budgets](../../content/scene-data/hero-street.steps34-acceptance.json).', '',
  '## Reproduction', '',
  'Run npm run bake:hero, then tools/refine-hero-irradiance.py --fresh and tools/compress-hero-textures.py with Python/Pillow/NumPy. The baker now selects its finish colour layer, merges equivalent finish slots, packs RGBA8 and exports real LODs. tools/blender/reexport_hero_finish.py can repeat export-only changes from the ignored saved Blender bake without recomputing light.', '',
  'Run npm run validate:hero, validate:optimization, validate:hero-section and validate:hero-anchors, plus the content/history/actors/people validators and browser production build. Capture surfaces34-before/after with --all --hardware and surfaces34-motion-before/after with --motion --hardware. Run node tools/benchmark-hero-finish.mjs for the three alternating route comparisons; it requires the ignored archived before-assets and always restores final assets in a finally block. Capture surfaces34-collisions with --collision-audit --hardware, then run node tools/report-hero-finish.mjs.', '',
  '## Next visual milestone', '',
  'The next useful pass is close-range authored asset work: improve the existing facade corner transitions, jamb/roof junctions and cloth attachment geometry using multi-angle inspection, followed by better skin/hair/clothing shading on the existing characters. Only then tune the broader lighting and sky against the reference, with the same locked comparison views. More small procedural noise alone will not close the remaining realism gap.', ''
].join('\n');
fs.writeFileSync('docs/design/hero-finish-steps-3-4-2026-10-24.md',document);
console.log(JSON.stringify(report,null,2));
