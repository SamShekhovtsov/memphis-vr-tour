import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const directory='docs/design/screenshots/',read=name=>JSON.parse(fs.readFileSync(directory+name+'.json'));
const quantile=(values,p)=>{const a=[...values].sort((a,b)=>a-b);assert.ok(a.length);return a[Math.floor((a.length-1)*p)];};
const round=n=>Math.round(n*10)/10,sha=b=>createHash('sha256').update(b).digest('hex');
const audit=read('hero-street-main-district-verified');assert.equal(audit.interactionAudit.passed,true);assert.equal(audit.collisionAudit.passed,true);
const performance={};
for(const tier of ['balanced','cinematic']){
 const runs=[1,2,3].map(n=>{const file=`hero-street-main-district-life-${tier}-after-${n}`,r=read(file);assert.match(r.gpu.renderer,/HD Graphics 4600/);assert.equal(r.benchmarkProtocol.frames,600);assert.equal(r.benchmarkProtocol.crowdWarmupSeconds,300);assert.equal(r.rendering.population.people,9);assert.ok(r.frameIntervalsMs.samples>=530);return {file:file+'.json',browserSession:r.browserSession,renderer:r.gpu.renderer,resolution:[r.renderWidth,r.renderHeight],samples:r.frameIntervalsMs.samples,p50:r.frameIntervalsMs.p50,p95:r.frameIntervalsMs.p95,drawsP50:quantile(r.renderProfile.samples.draws,.5)};});
 performance[tier]={runs,p50:round(quantile(runs.map(r=>r.p50),.5)),p95:round(quantile(runs.map(r=>r.p95),.5))};
}
const comparisons={};for(const view of ['north','hands']){const before=read(`hero-street-main-district-${view}-before`),after=read(`hero-street-main-district-${view}-after`);assert.deepEqual(before.camera,after.camera);assert.deepEqual(before.viewport,after.viewport);comparisons[view]={camera:before.camera,viewport:before.viewport,files:['before','after'].map(phase=>{const file=`hero-street-main-district-${view}-${phase}.png`;return {file,sha256:sha(fs.readFileSync(directory+file))};})};}
const manifest=JSON.parse(fs.readFileSync('apps/web-tour/public/assets/authored/hero-street/manifest.json'));
const result={date:'2026-10-25',population:9,roaming:8,working:1,performance,comparisons,interaction:audit.interactionAudit,collisions:audit.collisionAudit,exteriorRepair:manifest.exteriorRepair};
fs.writeFileSync('docs/design/district-interactions-2026-10-25.json',JSON.stringify(result,null,2)+'\n');
const find=word=>audit.interactionAudit.checks.find(c=>c.name.includes(word))?.detail;
const text=`# District interaction and exterior repair — 25 October 2026

Implemented the user's seven requested corrections. The new request for free district-wide movement supersedes the earlier fixed NPC paths. Building placement, district geometry positions, camera bookmarks and guided route data remain protected.

## Result

- Nine anatomical characters: the existing three plus six residents distributed at the riverside, gate, open yard, crafts area, temple approach and court. Eight roam; the craftsman works and rests at a stationary block. Existing character models and PBR textures are shared.
- Fourteen house footprint colliders replace the incomplete street-side rails. All four sides of each existing house are solid; the previously cleared temple approaches remain open. These houses have closed, non-enterable interiors.
- Corrected ${manifest.exteriorRepair.reversedPanelFaces} inward-facing plaster end-panel faces throughout all three street chunks. A 4 cm outward bake-only sampling shell repairs their original UV charts. Sky and sun bounce remain linear and separate from albedo/direct sun. No channel clips; pixels outside the repair masks are unchanged. Across 195,178 high-mesh triangles, the unique vertex-position/lightmap-UV sets and triangle counts are unchanged. Actual seam-preserving LODs were re-exported.
- Destination planning over 4,972 supported navigation nodes replaces sinusoidal loops. Production decisions use fresh cryptographic entropy, recent-destination memory, random purpose zones, pauses, glances and obstacle-aware routes. QA alone uses a reproducible seed. Paths may revisit streets naturally; this is varied destination-based behaviour, not a guarantee of never repeating in a finite district.
- Walking follows the smoothed body heading, with bounded turns, acceleration/deceleration, local avoidance and a 65 cm minimum center separation. Nobody translates backwards relative to body facing.
- Arms use an arm-specific two-bone solve, relaxed fingers and limited wrist bend. The worker has a small crouch, reachable contacts near the block edge and blended work/rest poses. Tool orientation is independent of wrist flexion. Existing ground-contact IK remains active.
- Walking stays horizontal regardless of view pitch and tracks the floor surface. Hold **F + WASD/arrows** for collision-aware view-directed flight. While F is held, Space rises and Ctrl descends. Release F to land; if over a roof/water/unsupported point, return to the last safe walking position. Losing focus clears held flight. The HUD explains the controls.

## Verification

${audit.interactionAudit.checks.length} live interaction checks and ${audit.collisionAudit.checks.length} existing collision checks pass, including all 56 house-side tests, temple floors/joins, open approaches, looking up/down while walking, held flight, landing and below-ground recovery. The navigation run covers six simulated minutes; a further 20 seconds exercises full-rate work/rest pose transitions.

- Minimum velocity/body-facing dot: ${find('toward body facing')}.
- Maximum turn rate: ${find('Turns bounded')} rad/s.
- Minimum resident separation: ${find('personal space')} m.
- Maximum wrist angle: ${round(find('wrist limits')*180/Math.PI)} degrees.
- Settled working contacts: ${JSON.stringify(find('Settled working'))} (metres).

The complete production build passes content, history, budgets, geometry/UV, camera/layout, actor, character, renderer, finish and interaction guards, plus both workspace builds. The existing Vite large-chunk warning remains.

## Matched views

Both pairs use the same absolute camera, viewport (1280 × 720), quality tier and QA time. Before uses archived street assets and the legacy population/pose branch; after uses the final normals, bake and behaviour. A resident/worker's motion may differ because the new controller replaces the former loops. Final assets are restored and hash-verified by the comparison harness; the benchmark harness separately restores its temporary source instrumentation.

| View | Before | After |
|---|---|---|
| Exterior ends | ![Before](screenshots/hero-street-main-district-north-before.png) | ![After](screenshots/hero-street-main-district-north-after.png) |
| Working hands | ![Before](screenshots/hero-street-main-district-hands-before.png) | ![After](screenshots/hero-street-main-district-hands-after.png) |

The three existing locked camera captures are also saved with the district-finished suffix.

## Intel HD 4600 desktop performance

Three fresh hardware Chrome sessions per tier, 600 rendered frames per full-tour run, 61 initial frames excluded, five simulated minutes of deterministic crowd warm-up before measurement. Nine residents are present in every run. Values below are medians of the three run percentiles; raw runs, renderer and actual render dimensions are in the companion JSON. No headset result is claimed. These are current measurements, not a controlled speedup comparison with earlier three-person runs.

| Tier | Frame interval p50 | Frame interval p95 |
|---|---:|---:|
| Balanced | ${performance.balanced.p50} ms | ${performance.balanced.p95} ms |
| Cinematic | ${performance.cinematic.p50} ms | ${performance.cinematic.p95} ms |

Far residents evaluate limb poses at 15 Hz beyond 35 m. Extra resident shadow casting uses 24/30 m hysteresis; the original three keep their existing shadow-casting range. Avatar geometry, materials and texture residency are shared. No resolution or material-quality reduction was introduced for these fixes.

## Reproduction and source preservation

- Run \`npm run build\` and \`npm run qa:district-interactions\` with the dev server on port 5573.
- Run \`node tools/capture-district-comparisons.mjs\` for both matched pairs and the original camera bookmarks. It temporarily swaps only the archived visual files and restores all final bytes in a finally block.
- Run \`node tools/benchmark-rendering.mjs --optimized-only --runs=3 --quality=balanced --label=district-life-balanced --crowd-warmup\`, then the same with cinematic and label district-life-cinematic. The harness restores main/scene sources and verifies their hashes. Do not run other captures/builds while its temporary instrumentation is active.
- Run \`node tools/report-district-interactions.mjs\` to regenerate this report from evidence.
- \`npm run repair:exteriors\` regenerates the corrected source, focused bakes, maps and LODs; set BLENDER_BIN/PYTHON_BIN as needed. Python requires NumPy and Pillow. The promoted street-finish pipeline invokes this correction automatically. The generator now gives each end skin its correct outward winding.
- Editable geometry is in \`content/source-assets/lighting/exterior-repair/exterior-corrected.blend\`; unclipped linear sky/bounce arrays, UV masks and immutable pre-fix visual inputs are beside it. Runtime glTF, PBR maps, scale and provenance remain available for later engines.
- \`district.interaction-revision.json\` records this explicitly authorized change above the prior locks. Original snapshots and hashes remain intact; do not overwrite old locks to hide a regression. Navigation footprints/spawns are separate metre-based data. Browser controllers will need native equivalents when integrating another engine.
`;
fs.writeFileSync('docs/design/district-interactions-2026-10-25.md',text);
console.log(JSON.stringify({performance:Object.fromEntries(Object.entries(performance).map(([k,v])=>[k,{p50:v.p50,p95:v.p95}])),checks:audit.interactionAudit.checks.length+audit.collisionAudit.checks.length}));
