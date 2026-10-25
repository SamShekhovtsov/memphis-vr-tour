# Full-tour rendering tests

25 October 2026. Testing only: no production scene/render implementation, asset, layout, position, walking-path or camera changes. The benchmark tool now forwards its requested quality tier to the capture tool; actual tier, antialiasing and shadow settings are asserted in every result.

## Results

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Full-route sweep | Before p50 / p95 | After p50 / p95 | p50 / p95 change | Faster pairs |
| --- | --- | --- | --- | --- |
| balanced | 58.8 / 110.3 ms | 39.1 / 77.8 ms | -33.5% / -29.5% | 5/5 |
| cinematic | 50.3 / 105.6 ms | 48.7 / 110.7 ms | -3.2% / 4.8% | 2/5 |

balanced: **measured improvement**.
cinematic: **no conclusive gain**.

Five alternating before/after pairs per tier (AB, BA, AB, BA, AB). One fresh hardware Chrome process per tier; sequential fresh page targets, identical 1280×720 viewport and hardware renderer. Normal/default presentation pacing, GPU timing queries disabled, builders/captures otherwise idle. Each run sweeps the complete existing Nile-to-Ptah guided camera route over 600 rendered frames, with frame-driven character time. First 61 frames excluded from timing: 539 intervals/run, 2,695 per variant/tier. Values are medians of five run percentiles. This is an accelerated route sweep, not the real-time 210-second playback or an XR qualification. Startup excluded; existing LOD streaming retained. Before disables only the new depth pass. Production source edits from the harness are restored and hash-verified.

The improvement criterion matches the earlier hero-street report: at least 5% lower median, no more than 10% growth in p95, and at least three of five pairs faster. Failure to meet it is not described as an improvement. Stalls and background/driver variation remain visible in the raw runs. Comparisons are paired within each tier; absolute times from separate sessions or the earlier street-only test are not pooled.

Balanced retains FXAA, 2048 PCF shadows and its original LOD/material settings. Cinematic retains MSAA4 + FXAA, 2048 PCSS shadows, 4× anisotropy, its longer LOD distances, ACES grading and vignette. No quality settings were reduced. Timing warm-up excludes the first approximately 10% of the route; screenshot checks additionally cover the fixed street bookmarks. The measurements do not include initial load time or qualify every frame of real-time playback.

## Per-pair results

### balanced

| Pair | Before p50 / p95 | After p50 / p95 |
| --- | --- | --- |
| 1 | 34.4 / 75.7 ms | 34.1 / 62.1 ms |
| 2 | 58.8 / 110.3 ms | 41.7 / 82.4 ms |
| 3 | 62.0 / 110.9 ms | 40.4 / 99.7 ms |
| 4 | 54.7 / 99.0 ms | 39.1 / 77.8 ms |
| 5 | 66.0 / 130.2 ms | 29.4 / 57.9 ms |

### cinematic

| Pair | Before p50 / p95 | After p50 / p95 |
| --- | --- | --- |
| 1 | 50.3 / 122.2 ms | 42.9 / 81.3 ms |
| 2 | 47.2 / 105.6 ms | 48.7 / 110.7 ms |
| 3 | 47.3 / 97.4 ms | 44.9 / 91.9 ms |
| 4 | 55.2 / 105.2 ms | 55.6 / 115.8 ms |
| 5 | 59.1 / 110.7 ms | 67.3 / 140.0 ms |

## Matched screenshots and locks

11 before/after image pairs: all pixel-identical. Moving captures check world matrices for characters, birds and smoke, along with camera, materials, texture storage and layout roots. The ten paired benchmark endpoints also preserve those states.

| Tier / view | Before | After |
| --- | --- | --- |
| balanced-route-90 | [Before](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-90-before.png) | [After](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-90-after.png) |
| balanced-route-180 | [Before](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-180-before.png) | [After](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-180-after.png) |
| balanced-route-360 | [Before](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-360-before.png) | [After](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-360-after.png) |
| balanced-route-600 | [Before](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-600-before.png) | [After](screenshots/hero-street-main-render-tour-balanced-quality-checkpoint-600-after.png) |
| cinematic-route-90 | [Before](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-90-before.png) | [After](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-90-after.png) |
| cinematic-route-180 | [Before](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-180-before.png) | [After](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-180-after.png) |
| cinematic-route-360 | [Before](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-360-before.png) | [After](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-360-after.png) |
| cinematic-route-600 | [Before](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-600-before.png) | [After](screenshots/hero-street-main-render-tour-cinematic-quality-checkpoint-600-after.png) |
| cinematic-hero-street-main | [Before](screenshots/hero-street-main-render-tour-cinematic-still-before.png) | [After](screenshots/hero-street-main-render-tour-cinematic-still-after.png) |
| cinematic-hero-street-material | [Before](screenshots/hero-street-material-render-tour-cinematic-still-before.png) | [After](screenshots/hero-street-material-render-tour-cinematic-still-after.png) |
| cinematic-street-entry | [Before](screenshots/street-entry-render-tour-cinematic-still-before.png) | [After](screenshots/street-entry-render-tour-cinematic-still-after.png) |

The image-check JSON records exact pixel and pose differences; raw captures are retained. Source/asset/layout integrity validation is run after the benchmark harness restores production files.

## Reproduce

Run sequentially with builders and other captures idle:

```powershell
node tools/benchmark-rendering.mjs --batch --runs=5 --quality=balanced --label=render-tour-balanced
node tools/benchmark-rendering.mjs --batch --runs=5 --quality=cinematic --label=render-tour-cinematic
node tools/capture-tour-rendering.mjs
```

`tools/verify-tour-rendering.py` checks the matched captures, and `node tools/report-tour-rendering.mjs` rebuilds this report and asserts the protocol. The earlier hero-street-only measurements remain in `render-performance-results-2026-10-25.md`.
