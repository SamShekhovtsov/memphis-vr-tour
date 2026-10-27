# Purposeful residents — six implementation steps

Branch: `codex/purposeful-residents`. Baseline: `7556d34`. Each step has its own commit; no deployment or merge is part of this change.

## Scope and behavior

The population remains 126: 51 temple, 50 village, 19 arrival-route and 6 open-space residents. Exactly 63 receive the new controller, stratified as 26/25/9/3. Their identities and personality parameters are stable across reloads. The remaining 63 retain the prior spontaneous controller. The original craftsman keeps its contact-specific controller and fixed work block.

1. **Profiles:** stable ID/seed, occupation, preferred pace, patience, sociability, diligence and personal space; fatigue, thirst and social need change over time. No network service, trained model or additional dependency.
2. **Affordances:** scene-derived prop stations, saved Blender workbench/basket/jar anchors, courtyard observation and supported rest/conversation places. Exact standing/facing points remain inside each resident's connected region. No buildings, props, colliders, route or stored camera are moved.
3. **Tasks:** utility selection followed by committed travel → alignment → timed action → cooldown. Distance, occupation, needs and recent visits influence selection. Completion and timeout are explicit; residents do not pick a different destination every frame.
4. **Coordination:** capacity-one leases expire after four simulation seconds without a heartbeat. Selected stations have one supported physical waiting point, with promotion after release. Paired conversations require both partners at their separate points, facing each other, and share an end time. An absent partner causes bounded abandonment.
5. **Animation:** inspection, work, rest and conversation gestures, blended upper-body poses and modest gaze/breathing. Nine existing live rigs remain; the other 117 residents share two GPU pose textures and the existing geometry/material/LOD system. Each atlas has 608 rows rather than 320: about 12.17 MiB for both float textures, an increase of 5.77 MiB over the former walk/idle atlases. There is no new texture download. Work gestures are generic inspection/handling motions; new residents do not simulate detailed finger contact, exchanging objects or producing goods. Existing carrier and craftsman contacts remain specialized.
6. **Navigation/performance:** retain the collision-aware graph, improve right-hand anticipatory passing and bounded sidesteps, limit path requests and retry frequency, stagger decisions at 1–2 Hz, and publish diagnostic snapshots at 4 Hz. Residents avoid visitor-occupied activity points and maintain an 85 cm approach clearance to a grounded observer. Recovery also detects nearly stalled creep, rather than only exactly zero velocity. Explicitly cover the final metre when A* start and goal occupy the same cell. No Recast/ORCA replacement or ML inference is needed for this increment.

These are authored, historically inferred background routines, not evidence of specific ancient individuals or rituals. The system is deterministic for QA and uses stable individual personality streams. It does not promise human-level reasoning or mathematically non-repeating paths in a finite district. Needs reset on reload; identity and traits remain stable.

## Validation and reproduction

- `npm run build` includes all prior immutable scene/asset/layout checks, the new revision guard and resident unit tests.
- `node tools/test-resident-intelligence.mjs`: 63 distinct stable profiles, stratification, task commitment/dwell/completion/failure, capacity/queue/expiry and mutual conversation readiness.
- With the dev server on port 5573: `node tools/capture-hero-shot.mjs purposeful-final-audit --hardware --audit-script=tools/audit-resident-intelligence.js`.
- Ten simulated minutes: **63/63 completed tasks; 555 completions, 66 paired conversations, 105 waiting-slot promotions**. All 10 live behavior checks passed. No building/zone violation; minimum center clearance ≥65 cm; forward-facing movement and 1.6 rad/s turn limit retained. Five activity kinds occurred.
- Synthetic decision cost averaged **0.047 ms/update**; complete life update averaged **2.54 ms** including movement and intermittent poses. This is a simulation diagnostic, separate from rendered full-tour measurements.
- Matched fixed-camera snapshots: `tools/view-purposeful-residents.js` advances both modes by the same 181 simulation seconds. `--legacy-intelligence` selects the previous random-goal controller without changing rendering settings, population, geometry or camera.
- Full-tour paired benchmark: `node tools/benchmark-rendering.mjs --intelligence-comparison --crowd-warmup --runs=3 --label=purposeful-tour`. The comparison counterbalances control/final order in separate hardware Chrome sessions, measures 539 intervals after 61 warmup frames, and restores instrumented sources with SHA checks. Do not run builds or captures concurrently with this harness.
- Cinematic check: use `--quality=cinematic --runs=3 --label=purposeful-cinematic`. To extend an existing first pair without overwriting it, use `--runs=2 --run-offset=1`. Hardware target is Intel HD 4600; headset validation remains deferred.

Previous revision snapshots are unchanged. `purposeful-life.revision.json` records this bounded layer and exact pre-change bytes for runtime/capture files. Editable Blender sources, PBR maps, glTF assets, scene scale and provenance remain unchanged for future Unity/Unreal adapters. The behavior modules are TypeScript browser code; engine ports must implement the same task, station and reservation contracts rather than expecting executable TypeScript in those engines.

## Further visual work

Screenshot review still shows existing garment/skin intersections and repeated character appearances in both modes. This behavior pass does not repair those assets.

After reviewing this movement pass, the next useful improvements are role-specific authored hand-contact animations at selected workbenches, prop-carrying with explicit pickup/drop-off states and licensed animation clips, and measured transition interpolation in the shared GPU atlas. These require separate visual/performance comparisons; increasing crowd count or adding a detector model would not address them.

## Matched views

All views use the stored camera, balanced settings, 1280×720 viewport, and 181 simulated seconds. Population positions naturally differ because the task controller replaces the previous random goals. Static scene positions and cameras are identical.

| Locked view | Random-goal control | Purposeful residents |
| --- | --- | --- |
| Main street | [Before](screenshots/hero-street-main-purposeful-control.png) | [After](screenshots/hero-street-main-purposeful-final.png) |
| Street entrance | [Before](screenshots/street-entry-purposeful-control.png) | [After](screenshots/street-entry-purposeful-final.png) |
| Material close view | [Before](screenshots/hero-street-material-purposeful-control.png) | [After](screenshots/hero-street-material-purposeful-final.png) |

## Review commits

1. [Persistent profiles](https://github.com/SamShekhovtsov/memphis-vr-tour/commit/dfed36e).
2. [Existing-scene activity points](https://github.com/SamShekhovtsov/memphis-vr-tour/commit/0ea4ee7).
3. [Committed utility-selected tasks](https://github.com/SamShekhovtsov/memphis-vr-tour/commit/dc934fa).
4. [Reservations, waiting slots and conversations](https://github.com/SamShekhovtsov/memphis-vr-tour/commit/d805e3f).
5. [Shared intent-driven gestures](https://github.com/SamShekhovtsov/memphis-vr-tour/commit/a6a77c8).
6. Navigation, visitor clearance, regression tests and final performance evidence: final commit on [the review branch](https://github.com/SamShekhovtsov/memphis-vr-tour/tree/codex/purposeful-residents).

## Final Intel HD 4600 measurements

Three pairs per tier; median of the three run percentiles, 539 measured intervals per run. Both modes retain the final navigation/rendering and 126 residents; the control disables the 63 task brains. Actual execution order is recorded in the JSON. Character positions differ as a consequence of behavior.

| Tier | Control p50 / p95 | Purposeful p50 / p95 | Change p50 / p95 |
| --- | --- | --- | --- |
| Balanced | 60.3 / 115.3 ms | 60.3 / 118.7 ms | 0.0% / +2.9% |
| Cinematic | 79.8 / 138.1 ms | 75.2 / 139.3 ms | −5.8% / +0.9% |

Both median percentile comparisons are within the proposed 5% regression budget. Absolute frame times remain high on this GPU; this is evidence of low incremental AI cost, not a claim of sustained 30/60 FPS. An initial single cinematic pair showed a +14.4% p95 change; its summary is preserved in [the pilot report](purposeful-residents-pilot-2026-10-27.json). Repeated final measurements above resolve that concern more reliably than one pair. Decision CPU cost is roughly 0.05 ms per life update; the renderer remains the dominant cost.

See [final machine-readable results](purposeful-residents-2026-10-27.json) and [the losslessly compressed original per-run JSON evidence](performance/purposeful-residents/index.json). Run `npm run qa:resident-intelligence` for the ten-minute behavior audit plus retained visitor/population regression audit; the wrapper fails when any live check fails. The full production build includes all historical integrity layers and the new unit tests. The six matched images were also checked for identical cameras, viewport, quality tier and simulation time.

Raw capture reports stay local beside the images. Run `node tools/archive-resident-evidence.mjs` to archive their exact bytes with SHA-256 checks and verified gzip round trips. The report generator reads either local raw JSON or the committed gzip archives after a fresh checkout.
