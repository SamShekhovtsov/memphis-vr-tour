# Hero street: daylight and baked-surface cleanup

The bake previously tested only the default value of Blender’s Alpha input. Imported glTF alpha can instead be linked into the shader graph, so old translucent grime, plaster and painted-shadow sheets survived as opaque surfaces and occluders. Their source glTF BLEND modes and alpha factors now drive removal. A regression validator rejects these sheets in every exported high-detail and reduced mesh.

The street was rebuilt from the same source placements. Cloth now has up to 18 cm of additional interior sag, with the original panel boundaries and attachment frames retained. The existing folds, thickness and hems remain. The bake uses 48 samples instead of 24; a small offline median/Gaussian filter reduces residual indirect-light noise. Raw irradiance is archived with hashes so filtering is repeatable.

Runtime changes rebalance baked indirect light against warm sunlight, reduce display contrast, add restrained distance haze and replace the flat beige sky with a stable world-space colour gradient. Existing linen uses thin-surface translucency. Cinematic mode adds contact-hardening PCSS shadows; balanced mode retains PCF, and headset mode retains its smaller map and separate postprocessing settings. No desktop depth of field or bloom was added.

The rendering intent is stored in content/scene-data/hero-street.daylight.json. Linear irradiance, PBR maps and glTF geometry remain portable; Unity/Unreal light intensity and exposure require engine-specific calibration.

## Matched views

All pairs use balanced quality, the original 1280 × 720 camera bookmarks, identical actor clip frames and frozen time of 2 seconds. Layout, actor roots, walking paths and cameras remain locked.

| View | Before | After |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-daylight-before.png) | [After](screenshots/hero-street-main-daylight-after.png) |
| street-entry | [Before](screenshots/street-entry-daylight-before.png) | [After](screenshots/street-entry-daylight-after.png) |
| hero-street-material | [Before](screenshots/hero-street-material-daylight-before.png) | [After](screenshots/hero-street-material-daylight-after.png) |

## Measured performance

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11). Render size: 1280 × 720.

| Balanced route sweep | Median frame | 95th percentile | Median-equivalent FPS |
| --- | --- | --- | --- |
| before | 36.5 ms | 86.5 ms | 27.4 |
| after | 25.9 ms | 61.4 ms | 38.6 |

Matched 1280x720 balanced-tier headless Chrome views at frozen time 2 seconds. One 180-frame accelerated route sweep before and after; 169 measured intervals each. Same GPU, viewport and route. Short measurements include streaming and shader warmup; no sustained or headset performance claim.

Cinematic after-only measurement (4x MSAA/FXAA and PCSS): 45.5 ms median, 105.4 ms 95th percentile, 22.0 median-equivalent FPS. No cinematic baseline was captured, so this is not a before/after comparison. [Cinematic preview](screenshots/hero-street-main-daylight-cinematic-preview.png).

High-detail street triangles: 193,610 → 171,682. Locked-main-view draw calls: 359 → 321.

Street texture delivery: 10.69 → 8.49 MB. These are downloaded-file sizes; GPU texture memory is not reduced by WebP.

[Raw matched-view, performance and asset results](hero-street-daylight-performance-2026-10-22.json).

All 26 live collision checks pass, including the repaired Ptah floors and both approach crossings. The separate headset configuration boots with the 1024px shadow map and three characters; no physical headset was tested.

TypeScript, the browser production build, actor/people provenance and rig checks, hero bake/source/camera/route locks, content/history checks and optimization validation passed. The bake validator was first run against the old assets and failed on an opaque legacy mud-daub sheet, then passed against the rebuilt high-detail and reduced assets.

## Reproduce

Run npm run bake:hero, then tools/refine-hero-irradiance.py --fresh and tools/compress-hero-textures.py with Python/Pillow. Filtering without --fresh reuses the local ignored raw-bake cache; on a fresh checkout, bake first. Start the dev server on port 5573 and capture daylight-after with --all --hardware. Capture daylight-benchmark-after with --benchmark --hardware --quality=balanced, daylight-benchmark-cinematic with --benchmark --hardware --quality=cinematic, daylight-collisions with --collision-audit --hardware, and daylight-headset-preview with --hardware --quality=headset. Run node tools/report-daylight-pass.mjs. Archived before captures were made before this implementation and must not be overwritten with the new scene.

## Remaining quality gap

This corrects substantial rendering and asset-pipeline defects; it does not reach the reference images’ final character and environment quality. The next priorities are anatomical face/eye/skin and hair assets, better fitted deforming linen, hand/load contact polish, and more authored surface breakup on the existing architecture. Those improvements must preserve the same scene locks. Physical-headset and sustained performance still require testing on the intended hardware.
