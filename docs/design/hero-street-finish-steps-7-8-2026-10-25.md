# Finished street: lighting and rollout

25 October 2026. Implements the two user-specified steps: final lighting for the upgraded surfaces and people, followed by an existing-surface rollout and desktop performance validation. District placement, camera route/bookmarks, actor roots/walking paths and collision functions remain locked. This is an incremental finish; it does not establish reference-level humans or environment quality.

## Final lighting

All three current chunks were rebaked on their existing UV1 charts at 2048 square and 48 samples, with separate sky diffuse and sun-bounce passes. Albedo, direct sun and moving people are excluded. Sky energy changes from 0.45 to 0.50 with a slightly more neutral sky colour; bounce energy changes from 2.0 to 1.75. Static contacts use 0.4 m visibility and at most 14% attenuation. Live human shadows remain. Unbaked-character sky fill increases from 0.8 to 0.864; exposure is 1.20, contrast 1.0 and fog density 0.0016. Sun direction/intensity stay fixed. One profile serves all locked views.

The audit found no clipping in old or new linear maps. Resolution and samples were retained after inspection. Editable 32-bit EXRs are losslessly ZIP-compressed with sample-for-sample verification. A 3x3 median and sub-texel kernel filter only baked irradiance; no screen blur, bloom or depth of field was added. Runtime PNG/lossless WebP maps retain an explicit range scale, currently 1.0, for engine calibration.

An upside-down atlas preview was rejected. Composition now converts Blender bottom-up pixels to PNG top-down rows. Independent coverage/orientation tests and RGBA8 packing fixtures guard this path. Rejected previews use steps78-after; accepted views use steps78-final.

## Existing surfaces, LODs and residency

The remaining lane-facing plaster receives shallow inward relief (at most 7 mm, original boundary vertices retained), shared high-detail plaster/linen families and deterministic plaster/wood/pottery wear. Accepted foreground geometry remains. No objects, buildings, clutter or blockers were added. The exporter explicitly selects HeroFinish into one normalized RGBA8 COLOR_0 stream, with no redundant float-colour stream. All high meshes and seam-preserving 55%/28% triangle LODs are regenerated. Original near/mid/far streaming and distance thresholds remain; no null visibility LODs were added.

| Assets | Before | Final |
| --- | --- | --- |
| High triangles | 183726 | 195178 |
| High GLBs | 12.80 MB | 13.63 MB |
| Streamed LOD GLBs | 15.08 MB | 15.99 MB |
| Runtime street maps | 10.09 MB | 9.31 MB |

Existing 14 MB high-geometry and 16 MB LOD budgets pass. Sharing the finished linen family reduces observed textures from 100 to 97, and estimated mapped texture storage from 388.35 to 384.35 MiB. The full-route endpoint reports 108 to 105 draws; this is a snapshot, not a route average. No new lighting textures or passes are added. Storage estimates exclude framebuffer/driver overhead and are not total measured VRAM.

## Desktop performance

| Tier | Baseline p50 / p95 | Final p50 / p95 | 10% regression budget |
| --- | --- | --- | --- |
| balanced | 42.8 / 83.6 ms | 34.7 / 74.0 ms | PASS |
| cinematic | 63.3 / 147.8 ms | 46.0 / 97.4 ms | PASS |

Three optimized-renderer runs per variant/tier, hardware Intel HD 4600 at 1280x720, default presentation pacing. Same 600-frame accelerated full-route sweep and deterministic actor timeline; first 61 frames excluded, 539 intervals/run and 1,617 per variant/tier. GPU queries off; builders idle during timings. Before/final sets ran in separate sessions around the offline bake, so this is a regression-budget comparison, not an interleaved causal speed-up experiment. Baseline filename suffix after means the existing depth optimization was enabled; extra legacy-renderer controls are retained but excluded. Startup and the first approximately 10% of route are excluded from timing. Real-time 210-second playback, sustained 60 FPS and headset qualification are outside this test; headset testing was explicitly excluded by the user.

The measured medians are lower, but session variation limits attribution. Frame stalls remain. Cinematic retains MSAA4/FXAA and PCSS; balanced retains FXAA/PCF. All raw per-run values and final LOD states are retained in the JSON.

## Matched views and route checkpoints

| View | Before | Final |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-steps78-before.png) | [Final](screenshots/hero-street-main-steps78-final.png) |
| hero-street-material | [Before](screenshots/hero-street-material-steps78-before.png) | [Final](screenshots/hero-street-material-steps78-final.png) |
| street-entry | [Before](screenshots/street-entry-steps78-before.png) | [Final](screenshots/street-entry-steps78-final.png) |

Sparse compositor-video samples were rejected. Exact-frame screenshots follow the original 14 m review segment on an identical actor clock. The archived pre-pass scene is restored for before captures; final buffers are restored and hash-verified afterwards. A reproduced before still is checked against the original baseline. Paired timing endpoints and route checkpoints preserve camera/root/actor states and world matrices.

| Route frame | Before | Final |
| --- | --- | --- |
| 180 | [Before](screenshots/hero-street-main-steps78-route-before-checkpoint-180-after.png) | [Final](screenshots/hero-street-main-steps78-route-after-checkpoint-180-after.png) |
| 360 | [Before](screenshots/hero-street-main-steps78-route-before-checkpoint-360-after.png) | [Final](screenshots/hero-street-main-steps78-route-after-checkpoint-360-after.png) |
| 600 | [Before](screenshots/hero-street-main-steps78-route-before-checkpoint-600-after.png) | [Final](screenshots/hero-street-main-steps78-route-after-checkpoint-600-after.png) |

26 live collision/floor/approach checks pass. Original section, character and renderer baselines are retained through a bounded revision chain. Text-format and binary hashes are tracked separately where Windows line endings require it.

## Small GPU compression trial

Three plaster maps use Khronos KTX-Software 4.4.2, UASTC quality 4, Zstd 18 and complete mip chains. Albedo remains sRGB; normals/ORM remain linear with full XYZ normals. The Intel GPU reports native BC7 format 36492 for all three. Decoder JS/WASM is self-hosted and SHA-256 pinned. Deliberately missing files recover to lossless WebP, clearing the error only after successful loading. Fallback images are compared exactly with default delivery.

Round-trip albedo PSNR: 58.3 dB. Normal p95 angular error: 0.63 deg, maximum 1.91 deg. Observed BC7 format implies approximately 4.00 MiB for these three full-mip maps versus 16.00 MiB as RGBA8, a 75% reduction excluding overhead. This is format-based storage, not measured total VRAM.

Compression is lossy; exact screenshot errors are recorded in the image-check JSON. The trial remains opt-in with ?textureTrial=1, with lossless WebP as default. Cold decoder cost, other GPUs and a KTX frame-rate gain are not qualified. Geometry compression remains disabled without a tested decoder path.

## Sources and reproduce

Editable base/final Blender files, base manifest and encoder pin: content/source-assets/street-finish/. Linear sky/bounce EXRs and rollout records: content/source-assets/lighting/steps78-bake/. Original linear PBR PNGs, glTF metres/Y-up conventions and provenance remain. The shared lighting profile is content/scene-data/hero-street.finish-lighting.json. Unity/Unreal exposure/light calibration requires work in those engines; no native-engine import qualification is claimed.

With Blender 5.1 and Python NumPy/Pillow, set BLENDER_BIN/PYTHON_BIN if needed. node tools/build-street-finish.mjs stages the build; --promote copies only the explicit visual file list into runtime. After reviewing a rebuild, run node tools/record-street-finish.mjs --refresh and npm run validate:street-finish. The immutable base snapshot prevents cumulative refinement.

For the trial, node tools/setup-texture-trial.mjs --encoder verifies pinned local dependencies and extracts the pinned encoder into the workspace using 7-Zip (SEVENZIP_BIN override). Then run node tools/encode-texture-trial.mjs and tools/verify-texture-trial.py. Runtime does not require external decoder hosting.

Checks: tools/test-finish-pipeline.py, node tools/capture-street-finish.mjs, tools/verify-street-finish.py and node tools/report-street-finish.mjs. Historical before captures require the local pre-pass archive; final rebuilding uses the preserved editable base and original PBR maps. Repeat desktop timings with node tools/benchmark-rendering.mjs --batch --optimized-only --runs=3 --quality=balanced --label=steps78-final-balanced, then cinematic under its own label, with builders/captures idle.

## Next quality work

The remaining largest realism gap is character face/eye/hand quality. For HD 4600 frame pacing, isolate PCSS and MSAA costs before another cinematic performance change. A sustained real-time route test should follow; the accelerated sweeps do not establish smooth long-session playback.
