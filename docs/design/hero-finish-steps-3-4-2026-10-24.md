# Hero street steps 3–4: foreground finishes

Started 24 October 2026; completed 25 October 2026.

This is an incremental surface and cloth improvement on the locked street. The matched views still show a substantial gap to the supplied cinematic references, especially in character shading, architectural repetition and the broad daylight/sky treatment. Passing technical checks does not establish reference-level realism.

## Implemented

The two foreground street-facing plaster finishes receive additional interior tessellation, at most 7 mm of inward surface relief, and unique low-wall wear/repair variation in opaque vertex colours. Foreground wall, jamb and roof-trim hard edges are rounded inward with a 35 mm/four-segment bevel, compared with the retained 18 mm treatment elsewhere. Existing surface vertices stay fixed during the shallow-relief operation; the edge treatment refines corner vertices inside the construction envelope. House masses and door marker extents stay fixed. New 1024² plaster albedo, tangent normal and ORM maps use broad hand-applied variation and millimetre-scale trowel relief over a two-metre tile. No new exposed brick grid or architectural features were added.

The existing foreground canopy and awnings use broad hanging bellies and corner-local folds rather than equally strong repeated ripples. Additional central sag is up to 24 cm for the large canopy and 12 cm for small awnings; the previous thickness and raised hems remain. Existing corner positions are the support frame. A separate 1024² linen family represents approximately 1.6 mm threads over a half-metre tile, with restrained normal strength and the existing translucency setting.

Nearby existing timber receives 3 mm edge rounding and pottery lips receive a 7 mm/three-segment bevel instead of the previous 4 mm/two-segment treatment. Both receive subtle spatial wear in vertex colour, retaining the existing thrown-clay curvature and bent timber. Canopy hems now extend along all four edges. This pass does not replace these props or add new objects. Roof extents, door openings, prop centres and route clearances are retained. The finish scope is Blender source Y=10.5..19.2 m, with facade X bands restricting plaster relief/material work to the lane-facing surfaces.

Cycles irradiance was rebaked for the final cloth/surface geometry at the existing 2048²/48-sample settings, then filtered and losslessly compressed. The sun, exposure, fog, camera settings and the bounded ground material are unchanged. Irradiance still excludes surface albedo and direct sun. Wear colours are applied by the runtime material, not painted into the irradiance.

## Protection and delivery

The in-memory audit verified all 1,713 source anchors and 70 protected building/door extents. Original source street GLBs, actor motion, district placement, cameras and routes retain their steps 1–2 hashes. The nine deliberately revised authored high/LOD GLBs have explicit before/after hashes in hero-street.steps34-revision.json; the original lock file is retained. Eight placement/camera/collision function hashes remain unchanged.

High-detail triangles: 171,682 → 183,726. Street texture delivery: 8.49 → 10.08 MB. Main-view draws: 321 → 329. Estimated texture storage: 348.4 → 380.4 MiB, including mipmaps; this is not measured total GPU VRAM. Existing 14 MB high-geometry, 16 MB streamed-LOD and 12 MB street-texture budgets pass. The separately budgeted ground remains 4.39 MB.

Duplicate finish material slots are merged. Wear colours use standard normalized linear RGBA8 COLOR_0 rather than full-precision floats. Other vertex attributes and index payloads are retained by the colour packer. Every high and LOD primitive is checked for retained colour/irradiance channels; high-mesh alpha values are checked to remain fully opaque.

The GLBs and ordinary PBR maps remain portable source assets. Unity/Unreal materials must multiply the base colour by linear vertex colour, read roughness from ORM green, use the declared tangent-normal convention, and bind UV1 irradiance separately. Those engine integrations and physical headset performance have not been tested.

## Matched captures

| View | Before | After |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-surfaces34-before.png) | [After](screenshots/hero-street-main-surfaces34-after.png) |
| hero-street-material | [Before](screenshots/hero-street-material-surfaces34-before.png) | [After](screenshots/hero-street-material-surfaces34-after.png) |
| street-entry | [Before](screenshots/street-entry-surfaces34-before.png) | [After](screenshots/street-entry-surfaces34-after.png) |

[Before route preview](screenshots/hero-street-main-surfaces34-motion-before.motion.webp) · [After route preview](screenshots/hero-street-main-surfaces34-motion-after.motion.webp).

Static comparisons use the same three bookmarks, 1280×720 balanced tier, two-second animation time, layout roots and lighting. Route previews follow the same 300-step, ten-second review segment. Compositor sampling can omit frames; these previews are not FPS measurements.

## Performance

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Route comparison | Median run p50 | Median run p95 |
| --- | --- | --- |
| before | 31.9 ms | 78.8 ms |
| after | 27.2 ms | 74.7 ms |

Three alternating archived-before/final-after accelerated route comparisons, each 180 rendered frames and 169 timed intervals, balanced 1280×720 on the same hardware GPU. Median of run p50 and run p95. Initial load excluded; LOD streaming included. No simultaneous asset builds. Short samples; not sustained performance or headset qualification.

The 10% aggregate regression budget passes: p50 change -14.7%, p95 change -5.2%. Timing is noisy on this older GPU; these short measurements do not establish a speed-up. Raw results retain every run. All 26 live collision checks pass, including the Ptah floors and both approach crossings.

[Raw results](hero-finish-results-2026-10-24.json) · [Step 3–4 acceptance/budgets](../../content/scene-data/hero-street.steps34-acceptance.json).

## Reproduction

Run npm run bake:hero, then tools/refine-hero-irradiance.py --fresh and tools/compress-hero-textures.py with Python/Pillow/NumPy. The baker now selects its finish colour layer, merges equivalent finish slots, packs RGBA8 and exports real LODs. tools/blender/reexport_hero_finish.py can repeat export-only changes from the ignored saved Blender bake without recomputing light.

Run npm run validate:hero, validate:optimization, validate:hero-section and validate:hero-anchors, plus the content/history/actors/people validators and browser production build. Capture surfaces34-before/after with --all --hardware and surfaces34-motion-before/after with --motion --hardware. Run node tools/benchmark-hero-finish.mjs for the three alternating route comparisons; it requires the ignored archived before-assets and always restores final assets in a finally block. Capture surfaces34-collisions with --collision-audit --hardware, then run node tools/report-hero-finish.mjs.

## Next visual milestone

The next useful pass is close-range authored asset work: improve the existing facade corner transitions, jamb/roof junctions and cloth attachment geometry using multi-angle inspection, followed by better skin/hair/clothing shading on the existing characters. Only then tune the broader lighting and sky against the reference, with the same locked comparison views. More small procedural noise alone will not close the remaining realism gap.
