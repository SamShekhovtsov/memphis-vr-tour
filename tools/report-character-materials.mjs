import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/design/screenshots/';
const read=name=>JSON.parse(fs.readFileSync(dir+name+'.json'));
const shots=['hero-street-main','hero-street-material','street-entry'];
const pairs={};
for(const shot of shots) {
  const before=read(shot+'-people-materials-before'),after=read(shot+'-people-materials-after');
  for(const key of ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','groundSection','activeIndices','drawCalls'])
    assert.deepEqual(before[key],after[key],`${shot}: changed ${key}`);
  const roots=a=>[...a].sort((a,b)=>a.name.localeCompare(b.name));
  assert.deepEqual(roots(before.layoutRoots),roots(after.layoutRoots),`${shot}: layout moved`);
  assert.deepEqual(after.textureErrors,[]);
  assert.ok(after.streetLods.every(lod=>!lod.failed.length));
  assert.equal(after.peopleMaterials.id,'hero-people-materials-v1');
  assert.equal(after.peopleMaterials.textureCount,6);
  const bindings=after.peopleMaterials.bindings;
  assert.deepEqual([...new Set(bindings.map(b=>b.family))].sort(),['hair','linen','skin']);
  assert.ok(bindings.every(b=>b.albedoSrgb&&b.normalLinear));
  assert.ok(bindings.filter(b=>b.family==='skin').every(b=>b.alphaTest));
  const extraTextureMiB=after.estimatedTextureMiB-before.estimatedTextureMiB;
  assert.ok(extraTextureMiB<=16);
  pairs[shot]={camera:after.camera,drawCalls:after.drawCalls,activeIndices:after.activeIndices,extraTextureMiB,bindings};
}
const median=a=>[...a].sort((a,b)=>a-b)[1];
const performance={};
for(const phase of ['before','after']) {
  const runs=[1,2,3].map(n=>read(`hero-street-main-people-materials-benchmark-${phase}-${n}`));
  for(const sample of runs) {
    assert.equal(sample.frameIntervalsMs.samples,169);assert.equal(sample.benchmarkProgress,1);
    assert.deepEqual(sample.textureErrors,[]);assert.deepEqual(sample.gpu,runs[0].gpu);
    assert.ok(!/SwiftShader/i.test(sample.gpu.renderer));
    assert.equal(sample.peopleMaterials.id,phase==='before'?'legacy':'hero-people-materials-v1');
  }
  performance[phase]={gpu:runs[0].gpu,renderSize:[runs[0].renderWidth,runs[0].renderHeight],
    p50:median(runs.map(r=>r.frameIntervalsMs.p50)),p95:median(runs.map(r=>r.frameIntervalsMs.p95)),runs:runs.map(r=>r.frameIntervalsMs)};
}
assert.deepEqual(performance.before.gpu,performance.after.gpu);
assert.deepEqual(performance.before.renderSize,performance.after.renderSize);
performance.p50Change=performance.after.p50/performance.before.p50-1;
performance.p95Change=performance.after.p95/performance.before.p95-1;
performance.regressionBudgetPassed=performance.p50Change<=.1 && performance.p95Change<=.1;
const collisions=read('hero-street-main-people-materials-collisions').collisionAudit;
assert.equal(collisions.passed,true);
for(const phase of ['before','after']) {
  const motion=read(`hero-street-main-people-materials-motion-${phase}`).motionRecording;
  assert.equal(motion.state.complete,true);assert.equal(motion.state.frame,300);
}
const manifest=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/people/manifest.json'));
const checks=JSON.parse(fs.readFileSync('docs/design/hero-people-material-channel-checks-2026-10-25.json'));
const results={date:'2026-10-25',pairs,performance,checks,collisionChecks:collisions.checks.length,
  peopleGlbBytes:manifest.assets.reduce((s,a)=>s+a.bytes,0),textureBytes:Object.values(manifest.materialRefinement.maps).reduce((s,a)=>s+a.bytes,0),
  balancedTextureBytes:Object.entries(manifest.materialRefinement.maps).filter(([name])=>!name.includes('-orm')).reduce((s,[,a])=>s+a.bytes,0),
  method:'Three alternating legacy/new material route sweeps on the same GPU, balanced 1280x720. Each run has 180 rendered frames, 169 timed intervals; report the median run p50/p95. Asset builds idle. Initial load excluded, LOD streaming included. Legacy disables new material/colour bindings on identical geometry; its three control images match the original baseline pixel for pixel. Short desktop samples, not sustained or headset qualification.'};
fs.writeFileSync('docs/design/hero-people-material-results-2026-10-25.json',JSON.stringify(results,null,2)+'\n');
const text=[
  '# Hero people: skin, hair and linen material pass', '',
  '25 October 2026. This improves the existing three characters with shared material detail. Their positions, walking paths, poses/IK, rigs, district, lighting and three camera bookmarks remain unchanged. The visual gain is restrained at the locked street distance; this is not a claim of cinematic human quality.', '',
  '## Implemented', '',
  '- Skin: warmer nonuniform diffuse colour, gentle cheek/ear/joint pigment variation in bind-pose vertex colour, a fine generic pore normal tile, and restrained dielectric reflectance. Balanced uses roughness 0.64; cinematic adds the roughness map. Highlights come from the existing lights. No painted shine or emissive fill; full subsurface scattering is not implemented.',
  '- Hair: dark-brown short-clump and strand detail with tangent normals. Balanced uses roughness 0.53; cinematic adds mapped roughness and mild anisotropy. The existing cropped cap silhouette and head weights are retained; this does not add individual hair strands/cards.',
  '- Linen: irregular warp/weft detail, matte roughness and subtle hem/crease colour variation. Balanced uses roughness 0.94; cinematic adds mapped roughness and low fibre sheen. New UVs travel with the existing garment as it bends.',
  '- Garment coverage: binary skin vertex alpha clips only covered torso/upper-thigh regions inside generous hem/waist margins. Arms, hands, head and lower legs are excluded by the bind-pose region checks. This reduces the conspicuous brown skin patches through the existing kilts without altering indices or weights. It is an alpha-test material mask, not alpha blending or cloth simulation. Existing garment fit/weighting can still need a dedicated geometry pass for other poses.', '',
  '## Locks and validation', '',
  'The original binary payload of each person GLB is retained byte for byte, including positions, normals, existing UVs, indices, joint IDs and weights. Only missing UV attributes and normalized RGBA8 material colour/coverage attributes are appended. Nodes, skin definitions, original material fallback values and scene transforms are checked separately. The original avatar loading/pose/IK code is hash-checked after removing exactly three material-binding additions. Seventy-one scene, ground, street, lighting, motion and camera files retain their hashes.', '',
  `Balanced loads six 512² albedo/normal maps: ${(results.balancedTextureBytes/1e6).toFixed(3)} MB of runtime download and ${pairs['hero-street-main'].extraTextureMiB.toFixed(1)} MiB estimated RGBA8+mipmap texture storage. Cinematic also loads the three ORM maps, totaling ${(results.textureBytes/1e6).toFixed(3)} MB and 12 MiB. No extra draws or triangles are added. Shared people GLBs total ${(results.peopleGlbBytes/1e6).toFixed(3)} MB, within the existing 4 MB limit; they grew by approximately 0.30 MB for the material attributes. Storage estimates are not measured total GPU VRAM.`, '',
  'PNG sources and byte-verified lossless WebP delivery are retained. Albedo is sRGB; normal/ORM are linear. ORM blue is zero metallic and red is unused white, keeping lighting separate. Unit normals, roughness bounds, hashes and alpha-mask placement are checked. All three original/legacy-control screenshots match pixel for pixel.', '',
  '## Matched views', '',
  '| View | Before | After |','| --- | --- | --- |',
  ...shots.map(shot=>`| ${shot} | [Before](screenshots/${shot}-people-materials-before.png) | [After](screenshots/${shot}-people-materials-after.png) |`),'',
  '[Before movement](screenshots/hero-street-main-people-materials-motion-before.motion.webp) · [After movement](screenshots/hero-street-main-people-materials-motion-after.motion.webp).', '',
  'The static views freeze the same two-second animation time at 1280×720 balanced settings. The movement previews use the same 300-step/ten-second route segment; sampled compositor frames are playback previews, not game-FPS measurements. The midpoint comparison makes the reduced kilt breakthrough more apparent than the distant static view.', '',
  '| Movement midpoint | Before | After |','| --- | --- | --- |',
  '| Existing route | [Before](screenshots/hero-street-main-people-materials-motion-before.motion-midpoint.png) | [After](screenshots/hero-street-main-people-materials-motion-after.motion-midpoint.png) |','',
  '## Performance', '',
  'The initial all-feature balanced test exceeded the 10% median budget (31.3 → 35.4 ms, +13.1%; p95 66.8 → 67.2 ms). The final balanced tier retains colour, normals and coverage while using constant family roughness and reserving the extra fibre lobes for cinematic. A redundant opaque-albedo lookup was removed from the skin shadow pass; the stock shadow shader did not apply the vertex coverage, so this retains the original opaque body shadow inside the garment. [Initial measurements](hero-people-material-initial-performance-2026-10-25.json) are preserved separately.', '',
  `GPU: ${performance.after.gpu.renderer}.`, '',
  '| Route | Median run p50 | Median run p95 |','| --- | --- | --- |',
  ...['before','after'].map(p=>`| ${p} | ${performance[p].p50.toFixed(1)} ms | ${performance[p].p95.toFixed(1)} ms |`),'',
  results.method, '',
  `Ten-percent regression budget: **${performance.regressionBudgetPassed?'PASS':'FAIL'}**. Median change ${(performance.p50Change*100).toFixed(1)}%; p95 change ${(performance.p95Change*100).toFixed(1)}%. Timing is noisy and spikes remain; short measurements cannot establish a speed-up. All ${results.collisionChecks} live collision checks pass, including the Ptah floors and approach crossings.`, '',
  '[Raw samples and checks](hero-people-material-results-2026-10-25.json).', '',
  '## Rebuild and engine portability', '',
  'Run tools/build-character-materials.py with Python/Pillow/NumPy. It can reconstruct the original attribute schema and binary prefix from the checked-in material lock if the ignored baseline archive is absent; --from-current exercises that path. Run npm run validate:people-materials, npm run validate:people and npm run validate:hero-section. The full production build includes the new validator and texture budget. tools/verify-character-maps.py verifies delivery channels and legacy image equivalence.', '',
  'The ordinary PBR maps, bind-pose UVs, linear vertex colour and skin coverage alpha remain available for Unity/Unreal. manifest.json materialRefinement.engineBindings declares channel/colour-space, repeat, normal, reflectance, anisotropy and sheen settings; browserTiers records the balanced/cinematic split. Importers must reset the original fallback base tint to white when binding these maps, multiply linear vertex RGB, and use alpha clip for covered skin. Final route timings qualify balanced only. Other-engine bindings, cinematic-tier route performance and headset performance remain untested.', '',
  'Capture before/control with --all --hardware --legacy-people-materials; after omits the legacy flag. Motion-before uses --motion --hardware --legacy-people-materials; motion-after omits the legacy flag. Capture collisions with --collision-audit --hardware. Run node tools/benchmark-character-materials.mjs with all builders idle, then node tools/report-character-materials.mjs. The original pre-change baseline images remain the before evidence; the runtime legacy switch permits repeated paired measurements without swapping files.', '',
  'The existing anatomy provenance remains as recorded in content/source-assets/characters/README.md. New maps and masks are project-authored and use no external media. The next priority is profiling the character and shadow passes to locate the measured regression before adding more effects. The next asset-quality pass is garment fit/weighting and facial/eye/hair silhouette work on the same characters, preserving their roots and routes; materials alone cannot resolve those shape limitations.', ''
].join('\n');
fs.writeFileSync('docs/design/hero-people-materials-2026-10-25.md',text);
console.log(JSON.stringify({performance,textureBytes:results.textureBytes,peopleGlbBytes:results.peopleGlbBytes,collisionChecks:results.collisionChecks},null,2));
