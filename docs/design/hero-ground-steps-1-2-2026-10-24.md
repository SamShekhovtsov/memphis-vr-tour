# Hero street steps 1–2: acceptance baseline and ground section

## Step 1: comparison and protection

1713 source-object origins are locked, including 70 protected house-mass/door marker extents. 18 geometry, route, camera, motion and lighting files are byte-locked; 8 placement, camera and collision functions are checked against the original implementation. The source anchors are regenerated in memory for verification without exporting any geometry.

[Acceptance criteria and initial budgets](../../content/scene-data/hero-street.acceptance.json) specify the existing 1280×720 balanced bookmarks, frozen time of two seconds, no new geometry/draw calls, at most 6 MB of extra runtime maps, at most 36 MiB of estimated additional texture storage, and at most 10% regression in the median-of-three p50/p95 results.

The three canonical views, actor clip frames, root transforms, active index counts and lighting settings match between the two versions. Geometry bytes and walking-surface heights are unchanged.

## Step 2: bounded physical ground material

The section covers x=-10.7..-1.55 and z=-22..-4 metres. It blends into the retained ground over 0.35 m at its sides and 1.5 m at its ends. It uses the original ground mesh and irradiance, with no additional transparent plane or displacement.

The soil detail comes from [Brown Mud Dry by Rob Tuytel](https://polyhaven.com/a/brown_mud_dry), under [CC0](https://polyhaven.com/license). Downloads were hash-verified. It is generic physical reference, not archaeological evidence for this specific street. The earlier dirt candidate was rejected for modern-looking debris and is not shipped.

A deterministic spatial blend varies four orientations of the 1.3 m source. Project-authored masks control lane compaction, edge/low-prop dust deposits, disturbed soil and sparse shallow bare-foot impressions. Normal relief is derived from the aligned height data in millimetres; it never modifies geometry or collision. Existing physical lighting and baked contacts remain separate from albedo.

Runtime maps are 2048² colour/blend alpha and 1024² normal/ORM. Albedo uses quality-92 WebP with exact blend alpha; physical channels use byte-verified lossless WebP. Editable RGBA masks, full-quality PNGs and a 16-bit height source are retained in content/source-assets/ground/hero-section-generated/. The fourth mask channel is data, not transparency, and is resized independently.

Additional download: 4.39 MB. Estimated additional RGBA8+mipmap storage: 32.0 MiB. Additional main-view draw calls: 0. These are texture-storage estimates, not measured total GPU VRAM.

## Matched views

| View | Before | After |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-ground12-before.png) | [After](screenshots/hero-street-main-ground12-after.png) |
| street-entry | [Before](screenshots/street-entry-ground12-before.png) | [After](screenshots/street-entry-ground12-after.png) |
| hero-street-material | [Before](screenshots/hero-street-material-ground12-before.png) | [After](screenshots/hero-street-material-ground12-after.png) |

[Before route preview](screenshots/hero-street-main-ground12-motion-before.motion.webp) · [After route preview](screenshots/hero-street-main-ground12-motion-after.motion.webp).

Both previews follow the existing x=-6, z=-18..-4 segment on a 300-step, 30 Hz simulation clock. Recorded compositor frames are assigned to that clock and encoded as approximately ten-second animated WebP previews (97/100 captured frames). Sampling and encoding can omit frames; previews are not game-FPS measurements. The browser video encoder was unreliable on the test GPU, so the recorder uses compositor captures instead.

## Performance

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Balanced route | Median run p50 | Median run p95 | Median-equivalent FPS |
| --- | --- | --- | --- |
| before | 39.6 ms | 78.0 ms | 25.3 |
| after | 35.8 ms | 77.8 ms | 27.9 |

Three alternating before/after accelerated 180-rendered-frame route sweeps, 169 intervals each; report median of the three p50 and p95 results. Same GPU, balanced tier, 1280x720. Initial load excluded; LOD streaming included. No concurrent asset builds or recording. Short desktop tests, not sustained/headset validation.

Timing varied: baseline run medians ranged 30.6–40.9 ms; updated run medians ranged 35.7–38.8 ms. One updated run had a 118.5 ms p95. The aggregate budget passes, but these noisy measurements do not establish a speed-up; frame-time spikes remain. Every run is retained in the raw report.

Initial performance budget: **PASS**. Median change -9.6%; p95 change -0.3%. All 26 live collision checks pass, including the Ptah floors and both approach crossings.

[Machine-readable results](hero-ground-results-2026-10-24.json) · [PBR/channel and protected-region checks](hero-ground-channel-checks-2026-10-24.json).

## Verification and reproduction

Run npm run validate:hero-section and npm run validate:hero-anchors. Build the material with tools/build-hero-ground.py using Python/Pillow/NumPy; verify delivered channels and the matched captures with tools/verify-hero-ground.py. Normal/ORM bytes, blend alpha, unit normals, nonmetallic rough soil and all four editable masks are verified independently. Protected canopy/sky pixels and roof surface interiors match. Small antialiased roof-edge differences are excluded with a two-pixel edge guard and reported separately; exact geometry/camera/light locks also pass.

The browser production build and existing hero, actor/people, content, historical and optimization validators passed. Root builds now include the section validator, and the optimization validator counts the additional ground downloads explicitly.

The geometry byte locks belong to the steps 1–2 baseline. Later authorized geometry refinements need deliberate revision of the affected byte hashes after anchor and visual verification; construction placements, camera and route locks remain protected.

Capture ground12-before with --all --hardware --legacy-ground, ground12-after with --all --hardware, and ground12-motion-before/after with --motion (add --legacy-ground for before). Capture ground12-collisions with --collision-audit --hardware. Capture three paired ground12-benchmark-before-N/after-N route runs with --benchmark --hardware, adding --legacy-ground for before. Run node tools/report-hero-ground.mjs. The recorder requires Python/Pillow; set PYTHON_BIN if it is not on PATH or in the Codex bundled runtime.

The GLB and PBR sources remain available for future Unity/Unreal use. The bounded world-space material binding is currently tested in browser WebGL; other engine bindings and physical headset performance are not claimed.

## Remaining visual work

This is the ground/validation milestone. It leaves the existing façades, cloth, props, people and lighting in place. Their further asset-quality work remains necessary to approach the supplied cinematic references; channel and budget checks do not automatically certify that visual standard.
