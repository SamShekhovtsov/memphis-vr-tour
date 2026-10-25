# Hero character performance correction

25 October 2026. CPU-only optimization preserves the finished contact shading, garment fit, worker interaction, root positions, walking paths, district layout and cameras. All three fresh before/after stills are pixel-identical. No resolution, quality, shadow bias, material, LOD or animation-rate reduction.

## Changes

- Index rig nodes once instead of repeatedly scanning the node array. Copy reset quaternions into existing objects rather than allocating new ones.
- Reuse the exact current world transform and already-refreshed parent matrix inside the IK orientation helper. A forced child update already traverses its ancestors, so rebuilding that chain again for translation and parent inversion is redundant. The two-bone solve, contact targets, roll and timing math are unchanged.
- Set the fixed carrier finger curl and worker hammer grip once. Their local rotations are constant; parent animation continues to move the hands normally.
- Reuse the supporting wrist rotation only when every input world-matrix element and the stone position match exactly. Any input change runs the original solve again. No positional rounding or update throttling.
- Evaluate worker-interaction diagnostics on demand for the QA snapshot. Previously they forced extra world-matrix traversals, rig lookups and diagnostic allocations for both hands on every frame. The pose still updates every frame.

A CPU sample of the original route showed matrix/IK work dominating the character path and little sampled cost in the new shadow callbacks. Sampling included startup and is diagnostic evidence, not a GPU timing measurement or a precise causal allocation of the earlier regression. The shadow implementation is unchanged.

The reference hand-finish test counts 744 forced world-matrix calls before and 408 after, a 45.2% reduction in that tested operation. This includes removal of per-frame diagnostic work and excludes test setup/comparison queries. It is an operation-count improvement, not a measured browser-frame speed-up.

## Matched visual evidence

| Locked view | Before optimization | After optimization |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-steps56-perf-before.png) | [After](screenshots/hero-street-main-steps56-perf-after.png) |
| hero-street-material | [Before](screenshots/hero-street-material-steps56-perf-before.png) | [After](screenshots/hero-street-material-steps56-perf-after.png) |
| street-entry | [Before](screenshots/street-entry-steps56-perf-before.png) | [After](screenshots/street-entry-steps56-perf-after.png) |

All three use the same 1280×720 balanced camera and frozen two-second animation state. RGB comparison: zero changed pixels for every pair. Reconstructed old-code controls also match all three before images exactly. Camera, root, original animation-group, render setting, surface/contact-shadow metadata, geometry count, draw count and texture-storage comparisons pass.

[Optimized movement preview](screenshots/hero-street-main-steps56-perf-motion-after.motion.webp) · [Original improved-version movement](screenshots/hero-street-main-steps56-motion-after.motion.webp). Same ten-second/300-step route; sampled compositor previews are not frame-exact comparisons or FPS measurements.

## Performance

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Variant | Median run p50 | Median run p95 |
| --- | --- | --- |
| Pre-step-5/6 baseline | 34.3 ms | 64.3 ms |
| Visual improvements, before optimization | 33.6 ms | 64.9 ms |
| Same visual improvements, optimized | 34.5 ms | 69.9 ms |

Three runs per variant, nine fresh hardware Chrome sessions; order rotates baseline/before/after, after/baseline/before, before/after/baseline. Balanced 1280×720, same Intel GPU and existing route. Each run renders 600 frames, excludes 61 warm-up frames and measures 539 frame intervals. Camera progress and character animation use the same deterministic frame timeline for every variant. Report the median of run p50/p95. Builders idle; startup excluded, LOD streaming included. Baseline uses original pre-step-5/6 assets and legacy pose/bias; before uses the completed visual improvements and original update code; after uses identical visual assets with optimized code. All temporary benchmark timing hooks, final source and assets restored and hash-verified. Desktop samples, not sustained or headset qualification.

Compared with the regressed version: p50 2.7%, p95 7.7%. Compared with the pre-step-5/6 baseline: p50 0.6%, p95 8.7%. Ten-percent regression budget against that baseline: **PASS**.

Interpretation: the defined pre-step baseline budget passes, and the CPU-operation reduction is verified. The optimized wall-clock frame times did not improve on the same-session regressed control. Do not claim a demonstrated FPS speed-up or that every source of the earlier timing regression has been isolated. Hardware/browser/background-load variation and frame stalls remain material limitations.

The old 24.2 → 27.4 ms result remains historical evidence in the step-5/6 report. The first new nine-run short set was also noisy and did not show an improvement: [all initial short samples](hero-people-performance-short-runs-2026-10-25.json) are retained. The harness originally advanced the camera by frame count while actors used wall time. The final protocol uses longer sweeps, a longer warm-up and identical simulated actor time, applied equally to every variant. It does not lower production animation rate or change paths/camera bookmarks. An [intermediate longer set](hero-people-performance-initial-extended-2026-10-25.json), before the final IK matrix-read optimization and same-frame cache correction, is retained too; it passed the baseline budget but did not improve on its same-session regressed control. Use the final three-way set below for the completed revision. Timing varies between runs; these tests cannot establish sustained framerate, headset readiness, or recovery of the earlier, separate character-material regression.

## Validation and reproduction

Production build and content/history/asset-budget/scene locks pass. A NullEngine regression test compares the optimized support/grip solve with the reconstructed original over repeated and changed inputs, including reflected roots: 444 world-matrix comparisons pass within 1e-6. The synchronized moving browser snapshots compare 25152 joint-matrix elements with maximum difference 0. All 26 live collision checks pass, including the Ptah floor and both village approaches. The completed ten-second movement preview exercises the unchanged route and foot solver.

The explicit source delta is content/scene-data/hero-people.performance-revision.json. The character validator checks current source hashes, reverses only that delta, then applies the earlier material/worker exceptions to verify the original avatar-code hash. The IK helper delta reconstructs the original protected GroundContactIK.ts hash. Existing body/rig/material/garment and 71-file scene locks remain active. HumanContactShadows.ts, visual assets and camera/path data are unchanged by this correction.

Run node tools/test-worker-pose-cache.mjs, npm run build, then—after builders stop—node tools/benchmark-people-performance.mjs --control and node tools/benchmark-people-performance.mjs --extended. The three-way benchmark needs content/generated/steps56-before for original visual assets. Original CPU code is reconstructed from the checked-in source delta; final files and temporary timing hooks are restored in finally. Never overlap source/asset swapping with builds or another capture.

Capture steps56-perf-after --all --hardware, steps56-perf-motion-after --motion --hardware and steps56-perf-collisions --collision-audit --hardware with tools/capture-hero-shot.mjs. Then run tools/verify-people-performance.py and node tools/report-people-performance.mjs. --profile saves diagnostic CPU samples under ignored content/generated/performance-profiles. No external character assets were introduced.

[Raw timing runs and checks](hero-people-performance-results-2026-10-25.json).
