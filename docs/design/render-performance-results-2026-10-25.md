# Hero-street rendering performance

25 October 2026. Existing geometry, textures, lighting, shadows, quality tiers, LOD thresholds, character updates, layout, walking paths and cameras are preserved.

## Bottleneck and change

Profiling identified expensive main-pass shading and scene submission. A small early depth pass now draws only existing opaque authored ground and plaster occluders, allowing the original colour pass to reject hidden fragments. It uses Babylon’s native depth-only queue and original vertex processing, retaining the colour order. Characters, cloth, alpha surfaces and shadow-map rendering are excluded. Shader readiness is refreshed between depth and colour draws, following Babylon’s depth-prepass rule. The guarded Babylon 7 queue adapter falls back to stock rendering if its expected shape changes.

Earlier transform/selection/material caching failed the longer timing gate and was rejected. Its code is archived in `content/source-assets/performance/RenderSelectionExperiment.ts`; measurements remain in `render-selection-failed-results-2026-10-25.json`. Black-output depth prototypes were also rejected and are not used for this result.

## Measured result

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Variant | Frame p50 | Frame p95 |
| --- | --- | --- |
| before | 54.4 ms | 94.8 ms |
| after | 49.1 ms | 86.7 ms |

p50 -9.7%; p95 -8.5%; 5/5 pairs faster. Gate (at least 5% median improvement, at most 10% p95 growth, majority of pairs faster): **PASS**.

Five alternating pairs (AB, BA, AB, BA, AB) in one hardware Chrome process. Balanced 1280×720, existing hero-street review segment, unchanged camera height/path and deterministic actor time; 600 rendered frames/run, first 61 excluded, 539 measured intervals/run and 2,695 per variant. Normal presentation pacing; GPU queries off; no build running. Median of five run percentiles. Before disables only the new depth pass. Temporary benchmark source edits restored and hash-verified.

| Pair | Before p50/p95 | After p50/p95 |
| --- | --- | --- |
| 1 | 52.6 / 116.9 ms | 49.8 / 86.2 ms |
| 2 | 54.4 / 94.8 ms | 49.1 / 90.8 ms |
| 3 | 55.9 / 101.0 ms | 48.7 / 81.5 ms |
| 4 | 51.5 / 87.6 ms | 49.6 / 87.3 ms |
| 5 | 54.4 / 92.0 ms | 47.5 / 86.7 ms |

CPU-side main submission rises from 12.8 to 15.7 ms and median draws from 296 to 307 because of the added depth work. The measured gain is in presented frame intervals; this is not a CPU-stage speed-up claim. GPU queries were excluded from the final timing set, so the fragment-shading mechanism is not independently quantified by GPU-busy timing.

This is a desktop hero-street measurement on this hardware/session. It does not establish headset, cinematic-tier or whole-tour throughput. Stalls remain; the raw per-run samples and CPU stage timings are retained in the JSON.

## Matched evidence

Three original locked bookmark images match pixel for pixel after the change. Moving checkpoints additionally compare camera state, materials, texture storage, layout roots and character/bird/smoke joint matrices. All measured endpoint matrices match within 1e-6.

| View | Before | After |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-render-perf-before.png) | [After](screenshots/hero-street-main-render-depth-ready.png) |
| hero-street-material | [Before](screenshots/hero-street-material-render-perf-before.png) | [After](screenshots/hero-street-material-render-depth-ready.png) |
| street-entry | [Before](screenshots/street-entry-render-perf-before.png) | [After](screenshots/street-entry-render-depth-ready.png) |

See `render-depth-image-checks-2026-10-25.json` and `render-depth-checks-2026-10-25.json` for strict checks. Renderer revision validation protects 111 unchanged scene/data/asset files.

Reproduce with `node tools/benchmark-rendering.mjs --batch --hero-street --runs=5 --label=render-depth-final`, with builders and other captures idle. This overwrites the named benchmark evidence. `node tools/test-render-depth.mjs` checks occluder eligibility, duplicates, pass exclusions, fallback and unchanged geometry/material/depth flags.

Temporary source edits from capture harnesses are restored in finally blocks. No production route/camera edits are needed.
