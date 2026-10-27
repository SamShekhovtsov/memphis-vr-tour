# CODEx Handoff: EgyptVRTour

Hero steps 1–2 (2026-10-24): source-object anchors, 18 byte-locked files and eight
placement/camera/collision functions now protect the ground proof section.
Run `npm run validate:hero-section` and `npm run validate:hero-anchors`.
The nearest ground uses CC0 dry-soil detail plus compaction/deposit/disturbance/
impression masks, with no displacement or new meshes. Rebuild with
`tools/build-hero-ground.py` using Python/Pillow/NumPy. Editable PNG masks and
16-bit height live under `content/source-assets/ground/hero-section-generated/`.
See [matched views, route previews, tests and performance](docs/design/hero-ground-steps-1-2-2026-10-24.md).
Byte locks are the steps 1–2 baseline; revise affected geometry hashes deliberately
for later authorized refinements after checking the unchanged construction anchors.

Hero daylight/bake cleanup (2026-10-22): legacy translucent sheets were surviving
as opaque geometry because imported alpha was linked rather than stored in the
BSDF default value. The baker now retires these using source glTF alpha factors;
the hero validator rejects them in all LODs. Cloth sag and daylight are refined.
After rebaking, run `tools/refine-hero-irradiance.py --fresh` with Python/Pillow,
then `tools/compress-hero-textures.py`. The raw cache lives in ignored
`content/generated/`; bake first on a fresh checkout. See
[matched views, remaining quality limits and performance](docs/design/hero-street-daylight-2026-10-22.md).

Ptah floor and approach collision repair (2026-10-22): temple floors now support
collisions and WebXR floor queries through to the rear walls; obsolete street
collision rail tails are removed from both sides of the open temple approach.
Run `npm run qa:collisions` against the dev server on port 5573. See
[causes, fixes and live collision checks](docs/design/temple-approach-collision-fix-2026-10-22.md).

This file is the project compass for future Codex runs. At the start of every run, respect these baseline decisions before making edits, planning new work, or suggesting changes.

Latest stages 5–7 pass: solid cloth backs/hems and refined vessel/support
silhouettes; three CC0 anatomical rig replacements with project-authored linen;
ACES desktop/headset tiers; measured, streamed replacement LODs and lossless WebP
delivery. Original actor roots, paths, district and cameras remain locked.
See [implementation, matched views and performance](docs/design/hero-street-stages-5-7-2026-10-22.md).
Run `npm run validate:people` as well as the existing actor/street validators.
Rebaking clears texture variants; rerun `tools/compress-hero-textures.py` afterward.

Latest hero-street surface pass (2026-10-22): authored bake v2 rounds existing
plaster edges, folds/sags existing cloth and refines pottery/wood/linen materials.
District, route and camera locks stay unchanged. See
[surface refinement and matched captures](docs/design/hero-street-surface-refinement-2026-10-22.md).
Regenerate with `npm run bake:hero`; validate with `npm run validate:hero`.

The existing three street actors now have shaped bodies, rounded features and
folded garments. Their original placements and animation channels are checked by
`npm run validate:actors`; see [character pass](docs/design/hero-street-character-pass-2026-10-22.md).
Elbows and knees now use continuous two-bone skinning with hands/feet attached to
the distal bones. Original root and shoulder/hip animation channels remain locked;
new tracks share their parent limb's original playback rate. See the
[joint pass and matched captures](docs/design/hero-street-joint-pass-2026-10-22.md).

## 1. Core Idea

Project title / experience framing:

Ancient Memphis: A Walk Through the White Walls

The product is a historically plausible living-history walkthrough of ancient Memphis, not a modern ruins tour. The visitor should feel like they are walking through a compact district of Memphis during the Early Dynastic / Old Kingdom scope: Nile arrival, settlement edge, residential street, craft/market life, and a temple endpoint.

The target feeling is: "I was there." The experience should be beautiful, calm, immersive, and credible. It should feel like a cinematic first-person walkthrough rather than a combat game, quest game, or educational slideshow.

Current selected scope:

- Temple endpoint: early Ptah / Hwt-ka-Ptah precinct.
- Living-city district: Kom el-Fakhry / Mit Rahina settlement evidence.
- Historical scope: ancient Memphis around the Early Dynastic / Old Kingdom period.
- MVP route: Nile-side arrival point, entrance/gate transition, compact mudbrick residential street, craft/market atmosphere, and eventual temple exterior/interior reconstruction.

## 2. Technology Direction

This is one shared project with two presentation targets, not two isolated projects.

- Browser version: TypeScript + Babylon.js / WebGL-WebGPU direction, optimized for laptop browsers and broad access.
- Full VR version: Unreal or Unity later, for high-end VR headset experience.
- Shared base: scene data, route definitions, evidence records, asset provenance, reference database, and generation/validation tools should remain common where possible.

Current implementation focus is the browser app. Keep the local development port at `5573` unless the user explicitly changes it.

## 3. Historical Evidence And Source Rules

Use official, scholarly, public-domain, open-access, or clearly licensed references whenever possible. The project can use artistic reconstruction, but it must remain historically restrained and evidence-aware.

Core rule:

- Confirmed evidence should stay distinct from inferred reconstruction and speculative/artistic reconstruction.
- Use the evidence toggle / evidence records to preserve trust.
- Do not copy or display copyrighted/protected source media directly unless the license allows it.
- Do not scrape arbitrary copyrighted media as training input.
- Prefer CC0, public-domain, CC-BY/open museum resources, owned materials, or paid/licensed datasets with provenance.
- Restricted or copyrighted visual references may guide high-level composition/evidence notes only when legally appropriate; runtime art must be project-authored or license-safe.

Egyptian language rule:

- Use a corpus/reference layer rather than pretending a model simply "knows" ancient Egyptian.
- A serious source to evaluate is the Thesaurus Linguae Aegyptiae, but check its terms before any bulk use, model training, or redistribution.

Historical design rule:

Whenever changing houses, humans, clothing, tools, boats, gates, temples, wall paintings, inscriptions, craft objects, plants, or architecture, check the design against what is known or plausible for ancient Memphis scoped around the Early Dynastic / Old Kingdom. Fill gaps with restrained artistic reconstruction, not fantasy.

## 4. Locked District Plan

Do not randomly move the district, street, houses, road, gate, or temple elements.

The current district layout should remain stable:

- Visitor arrives from the Nile/beach side.
- Visitor passes through the arrival/threshold gate area.
- The main residential hero street is offset from the direct gate line, so it is not accessible as a perfectly straight path from the entrance gates.
- The street sits closer to the Nile/beach than before, but slightly shifted right from the beach edge so it feels naturally embedded in the district.
- The two rows of houses face inward toward the street.
- The yellow/sandy packed street surface belongs inside the street between the two rows of houses.
- The `Play Route` path is a dedicated `guidedRoute` in `content/scene-data/memphis-white-walls.tour.json`; do not collapse it back to straight lines between story stops.

Only adjust these positions when the user explicitly asks for layout changes. Otherwise, preserve this district plan and work on visual quality.

## 4a. Locked Hero Camera

The current visual-quality benchmark is locked in:

- `content/scene-data/hero-street.camera-lock.json`
- `docs/design/hero-street-camera-lock.md`

Canonical benchmark:

- Shot id: `hero-street-main`
- URL: `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`
- Alias URL: `http://127.0.0.1:5573/?shot=canonical&chrome=0`
- Viewport: `1280x720`
- Position: `[-6.08, 1.52, -16.4]`
- Look at: `[-6.0, 1.14, 11.6]`
- FOV: `0.54` (existing V5 lock; documentation synchronized, camera not changed).

Use this camera for every texture, material, lighting, haze, and color-grading quality comparison. Do not change the canonical camera unless the user explicitly approves a new benchmark shot.

## 5. Current Goal

Current goal: improve visual quality, especially texture and material realism, toward cinematic quality.

Target: a browser-rendered scene that feels as close as possible to a real cinematic reconstruction. The reference quality is the user's cinematic screenshots and the Kom Ombo inspiration video: warm sun, credible haze, realistic materials, believable shadows, tactile dust/plaster/mudbrick/linen/pottery, and a strong first-person hero-street composition.

Current focus is not adding more objects. The scene already has enough elements for this phase. Work on making existing elements look better:

- Ground surface: remove procedural tiling/banding, improve packed dust realism.
- Mudbrick: more natural color, chipped/worn edges, surface variation, cracks, roughness.
- Plaster: less clean/white, more dusty chalk, stains, cracks, patch variation.
- Contact shadows: baked-looking darkness under walls, props, doorways, awnings, and people.
- Color balance: warm sun, cooler shadows, darker dirt, pale linen, clay pottery.
- Lighting: reduce over-bright haze, improve contrast, preserve warm atmospheric depth.
- Materials: albedo, normal, roughness, AO, height/decal layers where feasible.

Near-term quality direction:

- Build a proper authored ground/lightmap atlas instead of relying only on procedural color bands.
- Improve close-up wall/plaster material atlases.
- Add baked-looking AO/lightmap support for the hero street.
- Use fewer but better animated human figures rather than many placeholders.
- Keep the scene historically restrained for early Memphis / Old Kingdom.

## 6. After Every Run

At the end of every task, Codex should:

- Summarize what changed.
- Mention verification commands that passed or could not be run.
- If the task changed visuals, capture or reference a QA screenshot when feasible.
- Suggest the next practical steps for improving quality toward the cinematic target.
- Avoid expanding the district unless the user explicitly asks; prioritize quality of the hero street.

Next-step suggestions should be concrete and strategic, for example:

- Replace procedural ground with an authored baked ground atlas.
- Build close-up plaster/mudbrick atlases with normal/AO/roughness maps.
- Add baked lightmap support for doorway darkness and awning shadows.
- Improve character silhouettes and movement.
- Tune color grading and haze against side-by-side cinematic references.
- Optimize only after quality direction is visually working.

## 7. Current Technical Context

Important files and systems:

- Browser scene: `apps/web-tour/src/scene/MemphisWhiteWallsScene.ts`
- Runtime asset generator: `tools/generate-runtime-assets.mjs`
- Blender GLB generator: `tools/blender/generate_memphis_asset_kit.py`
- Generated textures: `apps/web-tour/public/assets/generated/textures/`
- Generated GLBs: `apps/web-tour/public/assets/generated/glb/`
- QA/design screenshots: `docs/design/screenshots/`
- Art direction notes: `docs/design/hero-street-art-direction-v1.md`
- Camera lock: `content/scene-data/hero-street.camera-lock.json`
- Camera lock docs: `docs/design/hero-street-camera-lock.md`

Recent quality-pass direction:

- Exposure and haze were reduced.
- Palette was moved toward darker dirt, sun-baked mudbrick, dusty plaster, pale linen, and clay pottery.
- The old Babylon hero street scaffold is hidden when the authored GLB hero street loads.
- The remaining quality gap is mostly material realism: ground banding, procedural texture feel, lack of true baked lightmaps, and not enough close-up material breakup.

## 8. Product Tone

The product phrase should be "historically plausible reconstruction." The user accepts that uncertainty exists and wants beautiful AI-assisted reconstruction, but the experience should be grounded in evidence, architecture, literature, surviving artifacts, historical writing, and license-safe references.

The cinematic goal should not erase honesty. The scene can be beautiful, but the evidence system must keep confirmed, inferred, and speculative elements visible when requested.

## Ground-contact IK follow-up (2026-10-22)

Ankle refinement: soles follow cached street normals, with restrained heel/toe
roll and support-edge compensation. See [ankle contact](docs/design/hero-street-ankle-contact-2026-10-22.md)
for matched captures, tests and rigid-sandal limitations. Foot-centre drift now
includes intentional rocking and is not a pure sliding measure.

Walking refinement: quintic swing travel, smooth lift/landing and speed-dependent
swing timing are documented in [walking smoothing](docs/design/hero-street-walking-smoothing-2026-10-22.md).
Matched before/after views now freeze exactly 300 simulated steps with unchanged
root paths and cameras. Contact continuity checks were added to the solver test.

Existing hero actors now use browser world-space stance contacts and a two-bone leg solve after their unchanged paths. Source GLBs, district and cameras remain locked. See [implementation, measured drift and matched screenshots](docs/design/hero-street-ground-contact-2026-10-22.md). The captured browser sequence reduced cumulative stance drift by 93.4%; extreme reach and sharp turns remain limited by fixed roots. Disable with ?ik=0. Run node tools/test-ground-contact-ik.mjs for solver checks.

## Foreground finish follow-up (2026-10-24)

Steps 3–4 refine the existing foreground plaster, wall/roof/jamb edges, canopy folds/hems and nearby timber/pottery. See [matched views, scope and performance](docs/design/hero-finish-steps-3-4-2026-10-24.md). The cinematic reference standard remains unmet; this is a bounded asset-quality milestone.

Keep the original section lock. Authorized authored-GLB revisions are recorded separately in `content/scene-data/hero-street.steps34-revision.json`; source anchors, construction extents, cameras, routes, actor motion and collision functions remain protected. New finish materials use opaque linear vertex colours (`COLOR_0`) and external PBR maps. The baker explicitly selects the colour layer, merges equivalent finish slots and packs normalized RGBA8 before export. Future engine materials must preserve vertex-colour multiplication and UV1 irradiance.

Use `tools/benchmark-hero-finish.mjs` only with the archived baseline available. It temporarily swaps visual assets between fresh browser runs and restores final files in `finally`; never run it concurrently with an asset build or another capture. Performance comparisons must use the final asset version with all builders idle.

## Character materials (2026-10-25)

The existing anatomical people now bind shared skin, cropped-hair and linen PBR maps, with bind-pose colour variation and garment UVs. Covered torso/upper-thigh skin uses a binary alpha-test mask to reduce skin poking through the existing kilts. No original positions, indices, weights, rigs, actor paths or camera data were changed. See [matched views, movement and performance](docs/design/hero-people-materials-2026-10-25.md).

Run `npm run validate:people-materials` to verify original GLB binary prefixes, rigs, avatar motion code and the scene-file lock. The checked-in `hero-people.material-lock.json` also lets `tools/build-character-materials.py --from-current` rebuild without ignored baseline archives. Keep `HeroPeople.ts` pose/path code intact; material bindings are isolated in `HeroPeopleMaterials.ts`.

For paired QA, `?peopleMaterials=legacy` disables only the new material and vertex-colour bindings. All three control views match the original baseline pixel for pixel. Use `tools/benchmark-character-materials.mjs` with builders idle. Engine importers must bind the external PBR maps with a white base factor, multiply linear vertex RGB and alpha-clip covered skin, following the portable settings in the people manifest. Other-engine/headset validation remains outstanding, as do facial/hair silhouette and garment fit improvements.

The final balanced timing set misses the 10% regression budget: median run p50 26.5 → 32.6 ms, p95 56.6 → 72.8 ms on Intel HD 4600 at 1280×720. Balanced uses six albedo/normal maps and constant roughness; cinematic retains nine maps plus fibre lobes. No draws or triangles were added. Keep the initial and final timing evidence; prioritize profiling character/shadow passes before more shading features. Do not describe this material pass as a performance improvement.

## Steps 5–6: contacts and existing people (2026-10-25)

See [implementation, matched captures and final paired measurements](docs/design/hero-street-steps-5-6-2026-10-25.md).
Static short-range AO is bounded to 18% attenuation of existing indirect UV1
irradiance; moving people are excluded. Closer human caster bias uses the same
shadow pass; architecture retains its stable original bias. No added runtime
maps, draws or geometry.

The existing linen wraps have explicit clearance and weight revisions; skin is
now opaque. The stone worker's upper-body solve bends toward the unchanged
stone, places the supporting hand and curls the hammer fingers. These are
intentional pose/garment exceptions recorded in
`hero-street.steps56-revision.json`; body geometry, rig, root/path tracks,
district, cameras and contact-leg solver remain protected. The prior material
report describes a historical alpha-test configuration, superseded here.

Use `npm run validate:people-materials` for the expanded original-stream and
source reconstruction checks. `?steps56=legacy` restores the old procedural
pose, coverage and caster bias; repeatable before timing additionally requires
the archived before GLBs/lightmaps. `tools/benchmark-steps56.mjs` swaps those
assets and restores final assets in `finally`. Run with builders and other
captures idle. Timing from the immediate previous material version must not be
represented as recovery of the older material-pass regression. Other engines,
cinematic-tier route timing and headsets remain unqualified.

## CPU performance correction (2026-10-25)

See [final source changes, matched captures and all timing sets](docs/design/hero-people-performance-2026-10-25.md).
Rig lookup indexing, fixed finger poses, an exact-input support-wrist cache,
on-demand worker diagnostics and reuse of already-refreshed IK ancestor matrices
remove redundant CPU work. Same-frame cache invalidation is tested. The IK solve
math, contact targets, paths, root positions, visuals and camera bookmarks remain
unchanged. All three final still pairs are pixel-identical; moving joint matrices
match the original update code.

The expanded `hero-people.performance-revision.json` records four source deltas.
The character validator reverses those deltas to check the previous avatar code
and original protected IK source hashes. Do not remove the original locks or
replace them with the optimized hashes. Run `node tools/test-worker-pose-cache.mjs`
and `node tools/test-ground-contact-ik.mjs` for cache/pose/contact correctness.

Final same-session synchronized 600-frame sweeps (three per variant, Intel HD
4600, balanced 1280×720) report median-run p50/p95: pre-step baseline 34.3/64.3 ms;
regressed visual version 33.6/64.9 ms; optimized version 34.5/69.9 ms. The 10%
budget against the pre-step baseline passes (+0.6% p50, +8.7% p95). CPU operation
reduction is verified, but these wall-clock measurements do **not** demonstrate
a speed-up over the same-session regressed control. Keep that distinction and
the noisy short/intermediate samples; do not claim the earlier timing causes
have all been isolated or that the separate material-pass regression is fixed.

Use `tools/benchmark-people-performance.mjs --extended` with builders/captures
idle. It temporarily synchronizes actor time and extends the existing camera
sweep equally for all variants, then restores and hash-checks source/assets.
Those benchmark hooks are not production scene changes. The original pre-step
visual archive is required; old CPU source is reconstructed from the checked-in
delta. All 26 live floor/approach collision checks pass.

## Hero-street depth-pass performance — 25 October 2026

Final implementation: `apps/web-tour/src/scene/RenderWorkOptimization.ts` adds
existing opaque authored dust/plaster/hero-plaster submeshes to Babylon 7's native
camera depth-only queue. Original colour order, geometry, textures, lighting,
shadows, tiers, LOD distances, root positions, paths and cameras remain unchanged.
Characters/cloth/alpha surfaces and shadow rendering are excluded. Keep
`checkReadyOnEveryCall=true` on those PBR materials: DEPTHPREPASS must refresh
between depth and colour draws, otherwise cached depth shaders black out colour.
The guarded queue adapter falls back to stock rendering if its shape changes.

Five alternating paired hardware Chrome runs, balanced 1280x720, existing hero
street review segment, 600 frames/run, 539 timed intervals/run, normal pacing,
GPU queries off: median-run p50 54.4 -> 49.1 ms (-9.7%), p95 94.8 -> 86.7 ms
(-8.5%). All five paired medians improved. This qualifies only this desktop
hero-street session, not the full tour, cinematic tier or headset throughput.
CPU main submission increases 12.8 -> 15.7 ms and draws 296 -> 307; report this
as a presented frame-time gain, not a CPU submission gain. GPU-busy savings were
not independently measured in the final set. Raw samples and rejected pilots
are retained; the earlier selection/material-cache candidate failed its gate.

Three original locked bookmarks plus street route frames 180/360/600 match
pixel for pixel. Each moving frame checks 8,992 world-matrix elements (max delta
0); the five paired endpoints match too. No quality settings reduced.
Depth queue fixture, workspace typechecks, production Vite bundle, character
integrity, hero section locks and renderer integrity pass. The renderer revision
protects 111 unchanged source/data/asset files. Public assets were unchanged;
final rebundle used copyPublicDir:false after their earlier validated build.

See `docs/design/render-performance-results-2026-10-25.md` and its JSON.
Reproduce with `node tools/benchmark-rendering.mjs --batch --hero-street --runs=5
--label=render-depth-final` while builders/captures are idle. Harness source edits
are temporary and restored with hash verification. Use
`node tools/test-render-depth.mjs` and `tools/verify-render-depth.py` for queue
and strict image/pose checks. `tools/report-render-depth.mjs` is the current
report generator; the older `tools/report-rendering.mjs` describes the rejected
selection experiment and must not overwrite the accepted result.

## Full-tour balanced/cinematic tests — 25 October 2026

No new production render/asset/layout/path/camera changes in this follow-up.
`tools/benchmark-rendering.mjs` now forwards --quality to both batch and single
capture modes. Actual tier/AA/shadow settings are asserted by the report tool.
It also supports --tour-checkpoints (90,180,360,600 on the existing full route).

Five alternating paired 600-frame full-route sweeps per tier, hardware Intel HD
4600, 1280x720, normal pacing, GPU queries off. Median-run p50/p95:
- Balanced: 58.8/110.3 -> 39.1/77.8 ms (-33.5%/-29.5%), all 5 pairs faster.
- Cinematic: 50.3/105.6 -> 48.7/110.7 ms (-3.2%/+4.8%), only 2/5 pairs faster.
Cinematic does NOT establish a reliable gain; retain this mixed result. No
production tier or optimization switch was changed to force an improvement.
Timings vary substantially; keep all raw runs. Do not compare absolute timings
across the two separate browser sessions or pool with earlier street-only data.

These are accelerated sweeps of the complete original Nile-to-Ptah route, not
210-second real-time playback or headset tests. The first 61 frames (~10% of
route) are timing warm-up, leaving 539 intervals/run and 2,695/variant/tier.
Cinematic retains MSAA4 + FXAA, 2048 PCSS shadows, 4x anisotropy and original LOD
ranges. Balanced retains FXAA/2048 PCF. All original assets/materials preserved.

All 11 matched image pairs are pixel-identical: four route checkpoints per tier
plus three locked cinematic street bookmarks. At each moving checkpoint all
8,992 character/bird/smoke matrix elements match exactly; all ten paired timing
endpoints match too. Harness production source buffers restored/hash-verified.
Renderer integrity (111 protected files), hero section and character locks pass.
The working tree may show removal of transient benchmark instrumentation from
a snapshot made while the harness was active; the protected production hashes,
not an instrumented snapshot, define the required final source state.

See docs/design/render-tour-results-2026-10-25.md and .json, with links to every
pair. Reproduce timings sequentially with --batch --runs=5 --quality=balanced
--label=render-tour-balanced, then --quality=cinematic --label=render-tour-cinematic.
Use node tools/capture-tour-rendering.mjs for all eleven paired shots,
tools/verify-tour-rendering.py for strict pixels/poses, and
node tools/report-tour-rendering.mjs for protocol assertions/report generation.

## User-clarified steps 7–8: finished-street lighting and rollout — 25 October 2026

The user superseded the old step-7/post and step-8/compression-only definitions.
Actual scope: final lighting after upgraded surfaces/people, then remaining
existing-surface rollout, reproducible source pipeline and desktop validation.
Selected hardware: Intel HD 4600; explicitly ignore headset testing for now.

All three chunks rebaked on existing UV1, 2048 square/48 samples, separate sky
and sun bounce, no albedo/direct sun/moving actors. Linear ZIP-compressed 32-bit
EXRs and editable base/final Blender files are preserved in source-assets.
No old/new clipped channels were found. A bottom-up Blender / top-down PNG
origin defect in a staging preview was fixed; keep the orientation/coverage
fixture. Accepted pictures use steps78-final; reject the older steps78-after.
Exposure 1.20, contrast 1.0, fog .0016, sky fill .864; original sun unchanged.
Static 0.4 m contacts attenuate indirect by at most 14%; live human shadows stay.

Remaining lane-facing plaster has up to 7 mm inward interior relief with
original boundaries retained. Existing wood/pottery wear and shared plaster/
linen finish families roll out across all chunks; no new objects or blockers.
High triangles 183,726 -> 195,178; high GLBs 12.80 -> 13.63 MB; streamed LODs
15.08 -> 15.99 MB (within unchanged 14/16 MB budgets). Declared runtime street
maps 10.09 -> 9.31 MB. Sharing linen removes 3 redundant textures: observed
100 -> 97; estimated mapped texture storage 388.35 -> 384.35 MiB.

Three optimized-renderer 600-frame full-route runs/variant/tier, default pacing,
GPU queries off, 539 measured intervals/run. Baseline/final sessions separated
by bake work; treat this as a 10% regression-budget test, not a controlled speed-
up claim. Balanced p50/p95 42.8/83.6 -> 34.7/74.0 ms; cinematic 63.3/147.8 ->
46.0/97.4 ms. Both budgets pass; stalls remain and sustained 60 FPS is not proven.
The suffix after in baseline timing names means the existing depth pass is ON;
legacy-renderer baseline controls are retained but excluded from comparison.
These are accelerated sweeps, not real-time 210-second playback qualification.

Three before/final bookmarks plus matched route frames 180/360/600 preserve
cameras/roots/actor state; 8,992 moving matrix elements/checkpoint match exactly.
All 26 live floor/approach checks pass. Sparse compositor movies were rejected;
use exact-frame route captures instead. Restored-before still reproduces the
original baseline pixel for pixel; final asset/source buffers restore by hash.

Optional ?textureTrial=1 uses three plaster UASTC quality-4/Zstd-18 KTX2 maps.
Native BC7 format 36492 verified on Intel; full mipchains imply ~4 MiB vs 16 MiB
RGBA8 storage for these maps. Default remains lossless WebP. Round-trip albedo
58.3 dB, normal p95 .63 degrees; rendered mean channel error ~.03 byte, p99 1 byte.
Deliberate failures recover to pixel-identical WebP without lingering errors.
Decoder assets, encoder pin and third-party notices are local/hash protected.
No KTX cold-start/FPS, other-GPU or native Unity/Unreal qualification is claimed.

See docs/design/hero-street-finish-steps-7-8-2026-10-25.md and JSON.
Rebuild: node tools/build-street-finish.mjs [--promote], with Blender 5.1 and
NumPy/Pillow Python (BLENDER_BIN/PYTHON_BIN overrides). Capture/verify with
capture-street-finish.mjs, verify-street-finish.py, test-finish-pipeline.py and
report-street-finish.mjs. Record-street-finish retains original protected hashes;
its dual normalized/raw hashes handle Windows JSON line endings. The explicit
steps78 revision permits only two material/render source files, visual GLBs,
lightmaps and manifest; actor/path/camera/collision source remains protected.
Do not refresh old locks to erase the baseline. Full build includes the finish
validator alongside history/content/budget/actor/character/section/render checks.

Final sign-off: full npm run build passed (including content/history/optimization,
hero/section/actor/people/material/renderer/finish checks and both workspace
builds). Vite retains the existing large-chunk warning. Final exact-frame image
checks pass; default controls and intentional WebP fallbacks match pixel for
pixel. BC7 pilot mean channel error is 0.025–0.029 byte, p99 1 byte across the
three cinematic views. All route pose differences are zero. The final scene is
incrementally improved, not a claim of reference-level cinematic humans or a
sustained 60 FPS walkthrough on HD 4600.

## District residents, solid houses and grounded observer — 25 October 2026

The latest user request explicitly replaces the former locked NPC paths with spontaneous movement across the connected walkable district. Preserve the static district layout and camera bookmarks; do not re-enable the old sine-loop drivers while DistrictLife owns the people. The old motion data remains an immutable comparison baseline, not the current runtime locomotion controller.

DistrictNavigation builds fourteen full house footprint colliders, disables the obsolete two street rails, and provides shared floor support plus a 1.5 m navigation graph (4,972 nodes). Six new residents share the existing licensed models/materials; eight characters roam and the craftsman works/rests. Production goals use crypto entropy, recent-goal memory, purpose zones, pauses, bounded turns, acceleration and local avoidance with a 65 cm center clearance. QA uses a seed. Revisited streets are natural; never promise mathematically non-repeating travel in a finite district.

GroundedVisitorCamera replaces vertical keyboard walking with projected horizontal travel and safe floor support. Hold F + movement for collision-aware view-directed flight; Space/Ctrl are flight-only modifiers. Release F to land, or return to the last safe support if over roofs/water. Blur clears keys. Unused QA shot cameras remain untouched, including their exact height.

NaturalArmPose avoids the former foot-style world-frame constraint on wrists. Hands inherit forearm orientation, fingers relax, the worker crouches slightly to reach the near block edge, and work/rest poses blend. The block is detached from its animated root and remains at its asset-authored world position. Existing foot IK stays active. Stable hand contacts and transition wrist limits are covered by live tests.

The black end panels came from inward face winding in irregular_end_wall_skin. The generator now takes the correct outward sign for each end. All three authored chunks repair 594 affected faces, bake-only outward receiver shells (4 cm) and their original lightmap charts. No high-mesh vertex positions or lightmap UVs change (195,178 triangles exhaustively checked). All real LODs are re-exported. The focused source, linear arrays, masks and immutable pre-repair inputs are in content/source-assets/lighting/exterior-repair. The editable corrected Blender file restores the normal sky setup. build-street-finish --promote now invokes repair-district-exteriors; Python needs NumPy/Pillow, with PYTHON_BIN/BLENDER_BIN overrides.

The bounded district.interaction-revision layer sits above the existing finish/render/character locks. Keep all original snapshots and hashes. Existing eight placement/camera/collision source functions and route/bookmark JSON remain protected. The interaction validator is part of npm run build. A complete production build passes; the existing Vite large-chunk warning remains.

See docs/design/district-interactions-2026-10-25.md and its JSON for the final evidence. The comparison tool temporarily swaps the archived street visuals and legacy pose/population branch, uses identical absolute cameras, and restores all final bytes. The performance harness now accepts --crowd-warmup: five simulated minutes before a 600-frame full tour. Never run captures/builds concurrently with its temporary source instrumentation; its finally block restores main/scene bytes and verifies hashes. Desktop target remains Intel HD 4600; headset testing is deferred by the user.

## Image-quality repair — 25 October 2026

See docs/design/hero-street-image-quality-2026-10-25.md and its JSON. The user requested smoother edges, sharpening and better textures without a large performance penalty. The final default uses CrispFxaa: a separately named derivative of the installed Babylon FXAA, via public updateEffect. It reuses cardinal luminance samples for bounded low-contrast detail enhancement, keeps strong edges antialiased and bypasses detail work on visually flat pixels. No separate sharpen pass or supersampling. Vendor files are untouched and hash-pinned; compilation failure falls back to native FXAA. Balanced stays single-sample; cinematic retains effective MSAA4. The heavier MSAA2 + separate-sharpen trial was rejected.

ImageQuality applies trilinear mip filtering and selective anisotropy: authored colour 4x balanced / 8x cinematic, physical maps 2x balanced / 4x cinematic, lightmaps 2x. Generated fallback textures retain their native tier levels. Actual sampler/mip settings and compiled resolve are checked live. Desktop clip planes are 0.1 / 512 m; camera poses and lenses remain unchanged. The visible angular guidedRouteLine is now opt-in with routeGuide=1, including with the normal HUD; route data and movement do not change.

Two older upper cloth skins crossed retained hero canopies. repair_cloth_overlaps.py removes exactly 1,760 middle-chunk triangles. Retained high-mesh positions/UVs and object transforms are verified unchanged; far/near geometry is unchanged. Actual LODs are rebuilt. Existing indirect maps remain, while direct sun shadows follow the corrected geometry. Editable source: content/source-assets/image-quality/cloth-corrected.blend. repair:exteriors now chains this correction and its geometry verifier after the normal repair/bake, preserving the current lighting manifest.

The new image-quality revision layer preserves all earlier before/after hashes and snapshots. Never refresh old locks to hide changes. Full npm run build includes validate:image-quality. Runtime image checks cover all original bookmarks and the normal UI; movement/house/temple/hand/spacing/flight checks still pass. The retained depth optimization is pixel-identical to its unoptimized colour-output control.

Final same-geometry HD 4600 comparison: three interleaved controls/finals, nine people, 300 s deterministic crowd warm-up, 600 full-tour frames and 61 initial frames excluded. Median run percentiles: control 48.7/79.9 ms p50/p95; final 50.8/81.5 ms (+4.3%/+2.0%). Desktop load causes absolute timing variation; do not compare these as a speedup against earlier batches. One cinematic smoke run: 57.1/87.0 ms, effective MSAA4. Intermediate rejected trials are archived under content/generated/image-quality-trials; only curated screenshots and final evidence remain in docs/design/screenshots. Headset remains deferred by the user.

## 180 residents and line-preserving clarity — 26 October 2026

The user requested twenty times the population plus better AA/sharpening/texture clarity. Default population is 180: preserve the original nine live rigs/foot IK and add 171 GPU-instanced residents using the same licensed anatomy and shared PBR materials. InstancedDistrictCrowd records two 64-frame walking bone atlases plus five walk/idle levels from the existing procedural/contact solver. Pose textures and bone RawTextures must retain nearest filtering; never treat them as authored surface maps. Idle residents share one identical atlas row. Added residents use recorded flat-ground contact, not 171 live IK solvers. Unsupported instancing/float-texture hardware retains nine rather than attempting incompatible GPU playback.

Native source determinant must match the reflected glTF parent: otherwise Babylon acts as a regular mesh for every instance, multiplying draw calls. The first candidate measured 116.4/187.7 ms p50/p95 and is rejected. Real skinned crowd LODs replace high detail at 8/20 m, with no null/hide levels. Female triangles: 33,371/9,746/2,638; male: 30,594/8,971/2,365. Original close meshes and the entire static district are untouched. Blender sources, source hashes, joint/bind/UV/colour/weight checks and runtime LOD files are preserved. The body LODs alone limit eight weights to four after 16-pose comparison: body p99 under 0.15 mm, max under 3.7 mm. Clothing weights remain unchanged. Rebuild with tools/blender/build_crowd_lods.py, then verify-crowd-lods.py. Browser BVA playback is engine-specific; source rigs/LODs/PBR maps remain reusable for later native-engine adaptation.

DistrictLife uses spatial neighbor buckets, four route searches per update, clearance-preserving nav-node spawning and more district-wide goals for added residents. Existing spontaneous pauses, bounded turns, acceleration, observer avoidance and ground support remain. Production entropy and deterministic QA seed remain separate. Never promise mathematically non-repeating travel.

CrispFxaa now uses 0.5 subpixel smoothing, coherent-edge threshold 0.10 and detail gain 0.12. Native vendor shader remains pinned/untouched. Ground albedo uses 8x anisotropy; other colour/physical/lightmap policies remain as before. Balanced stays one sample plus one AA/detail pass; cinematic retains MSAA4. The sag/irregularity of authored cloth and masonry is geometry, not a postprocessing defect that FXAA can straighten.

Diagnostic crowd=small restores nine people before any crowd bake/load. clarity=previous restores previous resolve/detail/ground-colour filter for same-machine controls. tools/capture-hero-shot.mjs forwards --small-crowd / --previous-clarity and records browser warnings. The benchmark forwards both flags. Do not run builds/captures concurrently with benchmark-rendering: its temporary main/scene instrumentation restores by hash in finally.

The bounded crowd-clarity revision layer sits above image-quality and all previous locks; preserve the immutable baseline snapshots and do not refresh earlier records. Full production build includes validate:crowd-clarity. Evidence and final interleaved HD 4600 results: docs/design/crowd-and-clarity-2026-10-26.md and JSON. Headset is still deferred. No deployment was performed.

## Zoned population and grounded step-up — 27 October 2026

The latest request supersedes the diffuse 180-person allocation: default total is 126 (30% fewer). district-population.json defines 40/40/15/5 weights. Largest-remainder whole-person counts are temple 51, street 50, route 19, free 6; the equal temple/street fractional tie follows config order. PopulationZones uses exclusive regions: temple precinct interior x[-12.6,12.6], z[49.2,91]; village lane x[-10.3,-1.95], z[-24.4,22]; 2.4m half-width around existing arrival-to-gate route segments excluding the first two; free is other connected navigation space. Spawn, goal selection, A*, shortcuts, detours and movement enforce these boundaries. Region boundaries never create physical visitor walls. Route approach components separated by the village wander locally rather than crossing the street quota.

Preserve the original work station. If an original actor standing point is obstructed, project to the nearest eligible node; do not randomly respawn the craftsman far from his detached block. A regression caught and corrected this. Density also exposed unlimited stacked detours and overly broad side-neighbor stops: ignore turning when measuring blocking, allow safe lateral passage and replace a blocked path with a clear side step or turned retreat. Keep 65cm hard clearance and bounded forward-facing turns.

The real riverLandingQuay top is 0.34m and landingRamp is a tilted box. DistrictNavigation now treats both as support and evaluates the ramp plane, not the AABB max everywhere. VisitorTraversal probes actual collider tops with a 0.38m step limit and overhead clearance. Physical ellipsoid clearance uses ellipsoidOffset while eye height moves smoothly. A short leading/trailing support footprint allows moving on/off the riser. Native collision handles sliding instead of rejecting the entire diagonal vector through nav.segment. Low ramp AABBs must not block the whole footprint. Walking remains horizontal, held F is view-directed flight, release lands safely; below-ground/unsupported recovery remains. Stored camera and route data and static geometry/colliders are untouched.

The zones-steps revision layer sits above crowd-clarity and all older locks. Baseline bytes are under content/source-assets/zones-steps-baseline. Update only record-zones-steps for this phase; do not rewrite earlier revision records to accept these changes. Full build includes validate:zones-steps. The additional GPU population is 117, with original nine live rigs and the same prior rendering/material/LOD policy.

Live evidence: tools/audit-zones-steps.js runs the full 126-person density and visitor tests; the retained 78 interaction +26 collision checks run in the nine-person diagnostic mode. compare-arrival-crossing.mjs temporarily uses only the archived camera/navigation sources for a matched arrival-edge test, restores current buffers in finally and verifies hashes. Do not run it concurrently with builds/captures/benchmarks. Missing quay support is the reliable old defect; whether a control completely stalls depends on initial overlap/timing, so use actual raw results rather than claiming every control freezes.

See docs/design/population-zones-and-steps-2026-10-27.md/JSON and its area map for final evidence, captures and a single HD4600 tour smoke measurement. The temple image is a temporary QA inspection view, not a changed bookmark. Headset remains deferred. No deployment was performed.

## Purposeful residents — 27 October 2026

User authorized all six behavior steps for 63 residents and six separate GitHub commits. Branch: codex/purposeful-residents, based on local 7556d34 (one commit ahead of origin/main at start). No main merge or deployment. Exactly 63 participants are selected 26/25/9/3 across temple/street/route/free; total126 and quotas51/50/19/6 remain. Existing craftsman stays contact-controlled at its fixed block.

ResidentProfiles, ResidentActivities, ResidentBrain and ResidentCoordination implement stable traits, needs, scene/Blender-anchor affordances, utility selection, committed task stages, lease capacity, one physical queue slot and paired conversations. Shared GPU action atlases add inspect/work/rest/socialize gestures; retain 9 live rigs and 117 GPU instances, existing materials and LOD geometry. Empty-hand work is generic; do not claim pickup/drop-off inventory or detailed new finger contacts. Profiles persist by seed; needs reset on reload. No ML inference or external dependency.

DistrictLife remains the sole movement owner. Stagger decisions, preserve 65 cm hard body clearance and 1.6 rad/s turns, pass on the right, use bounded detours and cover the final metre when A* start and goal share a cell. Do not restore legacy random pauses on a resident with an active brain. Visitor-occupied activity points are excluded; F-flight does not freeze people below a high observer.

New purposeful-life revision layer wraps zones-steps and older locks. Its exact before bytes and index are in content/source-assets/purposeful-life-baseline. Update only this active revision record; do not overwrite any older snapshots/records. npm run build includes new integrity and behavior-unit tests. Full-density behavior audit: tools/audit-resident-intelligence.js; retained visitor regressions: tools/audit-zones-steps.js. Completed local tasks count as meaningful progress instead of requiring constant pointless walking.

Performance comparison uses benchmark-rendering --intelligence-comparison --crowd-warmup; control disables task brains while retaining final rendering and navigation. Do not run builds/captures simultaneously with its temporary source instrumentation. It restores main/scene bytes with SHA checks. Final evidence and reproducible commands: docs/design/purposeful-residents-2026-10-27.md and JSON. Target remains Intel HD4600; headset deferred.
