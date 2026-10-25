# Rendering performance: static scene work

25 October 2026. This changes CPU-side evaluation and binding of the existing renderer. No source geometry, textures, character positions, walking paths, district layout, camera bookmarks, lighting, shadow resolution/filter, antialiasing, post-processing settings or LOD thresholds were changed.

## Profile and implementation

Initial hardware profiling identified active-mesh evaluation and main submission as significant costs (representative CPU medians 6.5 and 6.0 ms, render targets 4.3 ms). The GPU elapsed-frame query reported 22.7 ms median; it includes elapsed command-stream time and is not a pure GPU-busy measurement. These diagnostic stages can overlap and must not be added. The sampling profile included startup and is not pooled with final benchmark timings.

- Cache world transforms for immutable architecture. Imported animation targets and descendants, existing character roots, birds, smoke, skinned/morphed meshes and camera-dependent objects are excluded.
- Put static meshes in a conservative 32-entry/depth-3 octree and keep moving, interactive, always-active and late-loaded objects in the dynamic set. Filter disabled candidates before costly mesh/material readiness checks. Sort candidates back into original scene order so transparent/coplanar ordering is retained. Shadows, picking and collision candidate providers are not replaced.
- Cache the immutable authored PBR materials. Animated water and other untagged materials remain live. Image-processing changes release the material cache for the next render and recache the settled configuration; this covers quality/XR shader-configuration changes without claiming headset qualification.
- Handle deferred mesh-added notifications synchronously at candidate selection as well, so newly streamed meshes are present on their first frame. Disposed meshes are removed. Skipping frustum clipping still uses the original candidate provider.

The first narrow/deep index covered too few frozen meshes and sorting cost outweighed the savings. The revised version includes fixed procedural architecture and uses a coarser index. Material-only, selection-only and combined cases were isolated in one browser. Uncapped and fresh-browser pilots were inconsistent and are retained in the raw results; they are not used as the final improvement claim.

## Final measured result

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Same visual scene | Median-run frame p50 | Median-run frame p95 | Scene-frame work, CPU-side elapsed |
| --- | --- | --- | --- |
| before | 26.6 ms | 53.4 ms | 20.0 ms |
| after | 27.8 ms | 56.6 ms | 21.5 ms |

Frame p50 change 4.5%; p95 change 6.0%. 2/5 paired medians improve. Gate (at least 5% lower median, at most 10% p95 growth, and a majority of pairs faster): **FAIL**.

Five alternating before/after pairs in one hardware Chrome process (AB, BA, AB, BA, AB), normal/default presentation pacing; no uncapped flags. Balanced 1280×720, identical 600-frame camera route and frame-driven actor timeline. First 61 frames excluded; 539 intervals per run, 2,695 per variant. Report the median of five run p50/p95 values. CPU stage instrumentation is identical in both variants; GPU queries are disabled for the final comparison. Builders idle. Startup excluded, existing LOD streaming retained. renderPerf=legacy disables only the new renderer work; assets and previous character/IK optimizations are identical. Temporary timing hooks restored and hash-verified.

| CPU-side stage median | Before | After |
| --- | --- | --- |
| Active-mesh evaluation | 3.0 ms | 3.0 ms |
| Main draw submission | 4.6 ms | 5.3 ms |
| Render targets | 2.4 ms | 2.8 ms |

Final selection cache: 593 initial static meshes; 121 initial dynamic meshes; 117 authored materials. Late objects remain dynamic. Texture delivery and render resolution are unchanged. The Babylon total-vertex counter describes evaluated candidates and decreases when candidates are skipped; source geometry is unchanged, verified by asset hashes.

Frame stalls remain visible in the raw samples. This is a measured desktop result on this hardware/session, not a sustained FPS or headset guarantee. Cinematic-tier throughput and native Unity/Unreal rendering are not qualified here; the unchanged assets remain portable.

## Matched visual and motion evidence

| Locked bookmark | Before | After |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-render-perf-before.png) | [After](screenshots/hero-street-main-render-perf-after.png) |
| hero-street-material | [Before](screenshots/hero-street-material-render-perf-before.png) | [After](screenshots/hero-street-material-render-perf-after.png) |
| street-entry | [Before](screenshots/street-entry-render-perf-before.png) | [After](screenshots/street-entry-render-perf-after.png) |

All three bookmark pairs use the original camera and frozen two-second state and match pixel for pixel. Seven additional exact-frame route checkpoints use the same actor and camera timeline, then stop rendering before capture. Their accepted comparisons also have zero changed pixels. The route snapshots and five final sweep endpoints check character, bird and smoke matrices without changing their update rate.

| Route frame | Before | After |
| --- | --- | --- |
| 90 (isolated controls) | [Before](screenshots/hero-street-main-render-visual-isolate-legacy-a.png) | [After](screenshots/hero-street-main-render-visual-isolate-optimized.png) |
| 180 | [Before](screenshots/hero-street-main-render-quality-checkpoint-180-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-180-after.png) |
| 270 | [Before](screenshots/hero-street-main-render-quality-checkpoint-270-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-270-after.png) |
| 360 | [Before](screenshots/hero-street-main-render-quality-checkpoint-360-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-360-after.png) |
| 450 | [Before](screenshots/hero-street-main-render-quality-checkpoint-450-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-450-after.png) |
| 540 | [Before](screenshots/hero-street-main-render-quality-checkpoint-540-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-540-after.png) |
| 600 | [Before](screenshots/hero-street-main-render-quality-checkpoint-600-before.png) | [After](screenshots/hero-street-main-render-quality-checkpoint-600-after.png) |

One initial frame-90 pair differed in 4881 distant wall-edge pixels (maximum channel delta 28). Repeating the unchanged renderer also differed from that original baseline by the same 4881 pixels. In the isolated rerun, two unchanged controls and the selection-only, material-only and combined modes all matched exactly. The original mismatch is retained, not overwritten: [initial before](screenshots/hero-street-main-render-quality-checkpoint-90-before.png), [initial after](screenshots/hero-street-main-render-quality-checkpoint-90-after.png). This is recorded as baseline run-to-run variation; its underlying cause has not been isolated. The strict frame-90 quality check uses the repeated controlled pair.

[Optimized hero-street movement preview](screenshots/hero-street-main-render-perf-motion-after.motion.webp). The preview is a 300-step/ten-second simulation with sampled compositor frames, not a performance measurement.

## Validation and reproduce

Production build, original layout/actor/character/IK locks and the new 111-file renderer integrity check pass. The selection test covers 3820 visible-candidate checks over 32 camera poses, stable draw order, moving roots, late objects, enable/dispose, the no-frustum fallback, live PBR water and image-processing cache invalidation. All 26 live collision checks pass, including Ptah floors and both village approaches.

The renderer-only revision is content/scene-data/hero-street.render-performance-revision.json. It reconstructs the unchanged HumanContactShadows.ts implementation after removing exactly the new import/call, hashes RenderWorkOptimization.ts, and protects scene/data/asset inputs. The original character and motion locks remain intact. No new external media or character assets were introduced.

Run node tools/test-render-selection.mjs and npm run build. With builders idle, run node tools/benchmark-rendering.mjs --batch --runs=5 --label=render-final. Use --batch --checkpoints --label=render-quality for exact-frame route captures and --batch --isolate-frame=90 --label=render-visual-isolate for repeated controls. Capture render-perf-before --all --hardware --legacy-render-perf and render-perf-after --all --hardware with tools/capture-hero-shot.mjs; capture render-perf-motion-after --motion --hardware and render-perf-collisions --collision-audit --hardware too. Run tools/verify-rendering.py, then node tools/report-rendering.mjs. The harness restores original main/scene buffers in finally; never overlap it with another capture or build.

[Raw final runs, stage counters, pilots and checks](render-performance-results-2026-10-25.json).
