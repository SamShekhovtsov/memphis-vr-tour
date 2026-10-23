import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const directory = 'docs/design/screenshots/';
const read = label => JSON.parse(fs.readFileSync(directory + label + '.json'));
const shots = ['hero-street-main', 'street-entry', 'hero-street-material'];
const pairs = {};
for (const shot of shots) {
  const before = read(shot + '-daylight-before');
  const after = read(shot + '-daylight-after');
  for (const key of ['viewport', 'camera', 'animationSeconds', 'actorAnimationGroups']) {
    assert.deepEqual(after[key], before[key], `Unmatched ${shot}: ${key}`);
  }
  assert.equal(after.heroPeople, 3);
  assert.equal(after.groundContacts.length, 6);
  assert.deepEqual(after.textureErrors, []);
  assert.ok(after.streetLods.every(lod => !lod.failed.length));
  pairs[shot] = {
    camera: after.camera, viewport: after.viewport,
    drawCalls: { before: before.drawCalls, after: after.drawCalls },
    activeIndices: { before: before.activeIndices, after: after.activeIndices },
  };
}
const benchmarks = {};
for (const phase of ['before', 'after']) {
  const sample = read(`hero-street-main-daylight-benchmark-${phase}`);
  assert.equal(sample.benchmarkProgress, 1);
  assert.equal(sample.frameIntervalsMs.samples, 169);
  assert.ok(!/SwiftShader/i.test(sample.gpu.renderer));
  assert.deepEqual(sample.textureErrors, []);
  assert.ok(sample.streetLods.every(lod => !lod.failed.length));
  benchmarks[phase] = {
    gpu: sample.gpu, renderSize: [sample.renderWidth, sample.renderHeight],
    frameIntervalsMs: sample.frameIntervalsMs,
    medianEquivalentFps: 1000 / sample.frameIntervalsMs.p50,
    rendering: sample.rendering,
  };
}
assert.deepEqual(benchmarks.before.gpu, benchmarks.after.gpu);
assert.deepEqual(benchmarks.before.renderSize, benchmarks.after.renderSize);
const collisions = read('hero-street-main-daylight-collisions');
assert.equal(collisions.collisionAudit?.passed, true);
const cinematic = read('hero-street-main-daylight-benchmark-cinematic');
assert.equal(cinematic.benchmarkProgress, 1);
assert.deepEqual(cinematic.gpu, benchmarks.after.gpu);
assert.equal(cinematic.rendering.shadowFilter, 'PCSS');
assert.deepEqual(cinematic.textureErrors, []);
assert.ok(cinematic.streetLods.every(lod => !lod.failed.length));
const headset = read('hero-street-main-daylight-headset-preview');
assert.equal(headset.rendering.tier, 'headset');
assert.equal(headset.rendering.shadowMapSize, 1024);
assert.equal(headset.rendering.shadowFilter, 'PCF');
assert.equal(headset.heroPeople, 3);
const manifestPath = 'apps/web-tour/public/assets/authored/hero-street/manifest.json';
const original = JSON.parse(execFileSync('git', ['show', `HEAD:${manifestPath}`], { encoding: 'utf8' }));
const current = JSON.parse(fs.readFileSync(manifestPath));
const triangles = manifest => [0, 1, 2].map(level => manifest.assets.reduce((sum, asset) =>
  sum + (level ? asset.lods[level - 1].triangles : asset.triangles), 0));
const report = {
  date: '2026-10-22',
  method: 'Matched 1280x720 balanced-tier headless Chrome views at frozen time 2 seconds. One 180-frame accelerated route sweep before and after; 169 measured intervals each. Same GPU, viewport and route. Short measurements include streaming and shader warmup; no sustained or headset performance claim.',
  pairs, benchmarks,
  trianglesByLod: { before: triangles(original), after: triangles(current) },
  textureDelivery: { before: original.deliveryCompression, after: current.deliveryCompression },
  bakeSamples: { before: original.bake.samples, after: current.bake.samples },
  collisionChecksPassed: collisions.collisionAudit.checks.length,
  cinematicAfterOnly: { frameIntervalsMs: cinematic.frameIntervalsMs,
    medianEquivalentFps: 1000 / cinematic.frameIntervalsMs.p50, rendering: cinematic.rendering },
  headsetConfigurationBooted: true,
  physicalHeadsetTested: false,
};
fs.writeFileSync('docs/design/hero-street-daylight-performance-2026-10-22.json', JSON.stringify(report, null, 2) + '\n');
const rows = Object.entries(benchmarks).map(([phase, sample]) =>
  `| ${phase} | ${sample.frameIntervalsMs.p50.toFixed(1)} ms | ${sample.frameIntervalsMs.p95.toFixed(1)} ms | ${sample.medianEquivalentFps.toFixed(1)} |`);
const design = [
  '# Hero street: daylight and baked-surface cleanup', '',
  'The bake previously tested only the default value of Blender’s Alpha input. Imported glTF alpha can instead be linked into the shader graph, so old translucent grime, plaster and painted-shadow sheets survived as opaque surfaces and occluders. Their source glTF BLEND modes and alpha factors now drive removal. A regression validator rejects these sheets in every exported high-detail and reduced mesh.', '',
  'The street was rebuilt from the same source placements. Cloth now has up to 18 cm of additional interior sag, with the original panel boundaries and attachment frames retained. The existing folds, thickness and hems remain. The bake uses 48 samples instead of 24; a small offline median/Gaussian filter reduces residual indirect-light noise. Raw irradiance is archived with hashes so filtering is repeatable.', '',
  'Runtime changes rebalance baked indirect light against warm sunlight, reduce display contrast, add restrained distance haze and replace the flat beige sky with a stable world-space colour gradient. Existing linen uses thin-surface translucency. Cinematic mode adds contact-hardening PCSS shadows; balanced mode retains PCF, and headset mode retains its smaller map and separate postprocessing settings. No desktop depth of field or bloom was added.', '',
  'The rendering intent is stored in content/scene-data/hero-street.daylight.json. Linear irradiance, PBR maps and glTF geometry remain portable; Unity/Unreal light intensity and exposure require engine-specific calibration.', '',
  '## Matched views', '',
  'All pairs use balanced quality, the original 1280 × 720 camera bookmarks, identical actor clip frames and frozen time of 2 seconds. Layout, actor roots, walking paths and cameras remain locked.', '',
  '| View | Before | After |', '| --- | --- | --- |',
  ...shots.map(shot => `| ${shot} | [Before](screenshots/${shot}-daylight-before.png) | [After](screenshots/${shot}-daylight-after.png) |`), '',
  '## Measured performance', '',
  `GPU: ${benchmarks.after.gpu.renderer}. Render size: ${benchmarks.after.renderSize.join(' × ')}.`, '',
  '| Balanced route sweep | Median frame | 95th percentile | Median-equivalent FPS |',
  '| --- | --- | --- | --- |', ...rows, '',
  report.method, '',
  `Cinematic after-only measurement (4x MSAA/FXAA and PCSS): ${cinematic.frameIntervalsMs.p50.toFixed(1)} ms median, ${cinematic.frameIntervalsMs.p95.toFixed(1)} ms 95th percentile, ${(1000 / cinematic.frameIntervalsMs.p50).toFixed(1)} median-equivalent FPS. No cinematic baseline was captured, so this is not a before/after comparison. [Cinematic preview](screenshots/hero-street-main-daylight-cinematic-preview.png).`, '',
  `High-detail street triangles: ${report.trianglesByLod.before[0].toLocaleString('en-US')} → ${report.trianglesByLod.after[0].toLocaleString('en-US')}. Locked-main-view draw calls: ${pairs['hero-street-main'].drawCalls.before} → ${pairs['hero-street-main'].drawCalls.after}.`, '',
  `Street texture delivery: ${(report.textureDelivery.before.deliveryBytes / 1e6).toFixed(2)} → ${(report.textureDelivery.after.deliveryBytes / 1e6).toFixed(2)} MB. These are downloaded-file sizes; GPU texture memory is not reduced by WebP.`, '',
  '[Raw matched-view, performance and asset results](hero-street-daylight-performance-2026-10-22.json).', '',
  `All ${report.collisionChecksPassed} live collision checks pass, including the repaired Ptah floors and both approach crossings. The separate headset configuration boots with the 1024px shadow map and three characters; no physical headset was tested.`, '',
  'TypeScript, the browser production build, actor/people provenance and rig checks, hero bake/source/camera/route locks, content/history checks and optimization validation passed. The bake validator was first run against the old assets and failed on an opaque legacy mud-daub sheet, then passed against the rebuilt high-detail and reduced assets.', '',
  '## Reproduce', '',
  'Run npm run bake:hero, then tools/refine-hero-irradiance.py --fresh and tools/compress-hero-textures.py with Python/Pillow. Filtering without --fresh reuses the local ignored raw-bake cache; on a fresh checkout, bake first. Start the dev server on port 5573 and capture daylight-after with --all --hardware. Capture daylight-benchmark-after with --benchmark --hardware --quality=balanced, daylight-benchmark-cinematic with --benchmark --hardware --quality=cinematic, daylight-collisions with --collision-audit --hardware, and daylight-headset-preview with --hardware --quality=headset. Run node tools/report-daylight-pass.mjs. Archived before captures were made before this implementation and must not be overwritten with the new scene.', '',
  '## Remaining quality gap', '',
  'This corrects substantial rendering and asset-pipeline defects; it does not reach the reference images’ final character and environment quality. The next priorities are anatomical face/eye/skin and hair assets, better fitted deforming linen, hand/load contact polish, and more authored surface breakup on the existing architecture. Those improvements must preserve the same scene locks. Physical-headset and sustained performance still require testing on the intended hardware.', '',
].join('\n');
fs.writeFileSync('docs/design/hero-street-daylight-2026-10-22.md', design);
for (const [phase, sample] of Object.entries(benchmarks)) {
  console.log(`${phase}: ${sample.frameIntervalsMs.p50.toFixed(1)} ms p50, ${sample.frameIntervalsMs.p95.toFixed(1)} ms p95, ${sample.medianEquivalentFps.toFixed(1)} median-equivalent FPS`);
}
console.log(JSON.stringify({ pairs, triangles: report.trianglesByLod, textureDelivery: report.textureDelivery, collisionChecksPassed: report.collisionChecksPassed }, null, 2));
