# Cinematic Quality Roadmap v3

Goal: move the current Hero Street v2 from a good prototype toward a film-set-quality browser experience while preserving Early Dynastic / Old Kingdom Memphis restraint.

The next work should improve visual quality before adding more things. The street already has enough elements; the gap is realism, lighting, material response, composition, animation, and polish.

## Step 1: Lock The Beauty Shot Again

- Keep the district placement and hero street route fixed.
- Keep one canonical eye-height camera as the comparison benchmark.
- Capture the same shot after every quality pass.
- Compare against the two cinematic references and the compliance checklist.

Done when: every quality decision is judged from the same player-height street view, not from accidental aerial/debug views.

## Step 2: Sun And Atmosphere Clarity

- Reduce muddy white haze.
- Add a clearer warm sun direction with visible lit faces and readable shadow faces.
- Keep shadows cooler and dirt darker so the scene stops reading as one brown layer.
- Preserve doorway darkness and awning shade.

Done when: the street has a strong “sun from one side” read and the player can feel hot light vs shade.

## Step 3: Material Calibration, Not New Props

- Tune plaster, dust, mudbrick, linen, wood, pottery, skin, and dark-door materials as a palette.
- Fix tiling and procedural banding by adjusting texture scale, roughness, normal strength, and overlay masks.
- Make plaster more pale/earthen and less blocky.
- Make dust less orange and more compacted/sandy with darker worn traffic zones.

Done when: close walls and ground read as physical surfaces, not colored primitives.

## Step 4: Wall-Face Realism Pass

- Use fewer visible block lines on house fronts.
- Emphasize continuous mud plaster, rounded edges, worn corners, chipped lips, stains, and small exposed daub patches.
- Darken inner door volumes.
- Add subtle side-wall dirt gradients and roof-edge shadows.

Done when: the buildings look handmade and lived-in rather than modular boxes.

## Step 5: Baked Shadow Polish

- Strengthen Blender-authored contact shadows under walls, baskets, jars, benches, posts, and human feet.
- Add more directional awning shadows across the walking lane.
- Keep shadow geometry subtle and non-blocking.
- Avoid transparent artifact planes at the main wall and street entrance.

Done when: every object feels grounded without adding more real-time shadow cost.

## Step 6: Hero Human Upgrade

- Keep only two or three strong visible characters near the canonical shot.
- Use restrained Old Kingdom clothing: linen kilts, sheath-like linen garments, bare feet/simple sandals, simple hair, minimal jewelry.
- Restore walking locomotion where characters are supposed to travel, not just limb movement in place.
- Keep workers slower and grounded with clear silhouettes.

Done when: fewer characters feel more alive than the current placeholder crowd.

## Step 7: Browser-Film Post Pass

- Fine-tune tone mapping, contrast, color grading, vignette, and fog after material/light changes.
- Add subtle depth layering without obscuring the street.
- Keep the browser target usable on laptop hardware.

Done when: the canonical shot has warm sunlight, cooler shade, readable faces/walls, and cinematic depth without over-fogging.

## Step 8: Optimize Only After The Look Holds

- Keep near/mid/far GLB chunks.
- Add verified KTX2 texture compression.
- Add Draco/Meshopt only after decoder loading is tested in Babylon.
- Keep a visual regression screenshot before and after compression.

Done when: performance improves without changing the look.

## Historical Quality Gate

Before accepting each pass, check:

- Does it still look like ordinary Old Kingdom / early Memphis domestic architecture?
- Did we avoid late New Kingdom/Ptolemaic temple excess in the residential lane?
- Are all uncertain choices still plausible and evidence-aware?
- Are we improving quality rather than adding visual noise?

## Execution Log

### 2026-07-30: Steps 1-3 Started

- Step 1 beauty-shot lock confirmed against `content/scene-data/hero-street.camera-lock.json`.
- Baseline screenshot saved to `docs/design/screenshots/hero-street-roadmap-v3-start.png`.
- Step 2 sun/atmosphere pass improved direct warm sun, lowered fog, reduced vignette, and toned transparent baked-haze/shadow materials so the street no longer reads as heavily fog-muted.
- Step 2 screenshot saved to `docs/design/screenshots/hero-street-roadmap-v3-step2-sun.png`.
- Step 3 material calibration started: plaster, dust, mudbrick, linen, pottery, shadow, and hero-ground material response were rebalanced.
- The generated hero-street ground, AO, and lightmap textures were shifted away from dark red/orange toward compacted tan Nile dust with darker wall-base grime and worn traffic marks.
- Latest Step 3 screenshot saved to `docs/design/screenshots/hero-street-roadmap-v3-step3-materials-v4.png`.
- Historical guardrail: no new props, buildings, costumes, wall painting, or later-period decorative motifs were added during this pass.

### 2026-07-30: Step 4 Wall-Face Realism Pass

- Existing hero-street houses stayed in their locked positions; no route, street-mouth, road, or district-layout changes were made.
- The Blender GLB generator now gives each existing house front a continuous uneven plaster skin over the mudbrick core, replacing the harder rectangular facade-patch read with handmade mud-plaster/whitewash surfaces.
- Door openings were deepened with darker cavities and subtler jamb/lintel geometry so interiors read as shaded volumes rather than flat dark rectangles.
- Foreground eye-height walls now use mud-plastered massing plus continuous plaster skins instead of exposed mudbrick material, reducing the visible block-grid effect closest to the camera.
- The mudbrick atlas was softened so exposed mudbrick remains available as daub/core material, but no longer reads like a strict repeated brick wallpaper on every surface.
- The plaster atlas was rebalanced toward lower wall grime, hairline cracking, and chipped plaster without adding later-period decoration.
- Regenerated runtime textures and hero-street GLB exports: full, near, mid, and far chunks.
- Historical guardrail: this pass keeps ordinary Old Kingdom domestic architecture restrained: compact mudbrick construction, plaster/whitewash exterior read, small openings, simple wood/reed/linen material culture, and no New Kingdom/Ptolemaic/fantasy motifs.

### 2026-08-04: Existing Walls, Not New Ones Pass

- Existing White Walls threshold, gate storehouse, and early Ptah precinct wall boxes were kept in place; no new wall rows, buildings, gates, route blockers, or district-layout changes were added.
- Added reusable non-colliding Babylon surface patches for plaster scumble, lower wall grime, roof-edge shade, small exposed daub wear, and hairline settlement cracks.
- Converted the older hero-street runtime wall-detail clusters from harder rectangular wall boxes into visual surface patches, so they read as wear on existing walls rather than extra architecture.
- Applied in-place wall wear to both Nile/city faces of the White Walls threshold and to visible faces of the Ptah precinct walls.
- Historical guardrail: the pass keeps early Memphis / Old Kingdom domestic and threshold architecture plain, mudbrick-based, plastered/whitewashed, and restrained; no later temple decoration or fantasy wall motifs were introduced.

### 2026-08-05: Historical Compliance Guardrail

- Added machine-readable historical compliance rules for the Ancient Memphis / Early Dynastic / Old Kingdom scope.
- Added `npm run validate:history` to check tour scope, evidence labels, required guardrail docs, runtime asset provenance, hero-street material notes, and GLB asset-kit notes.
- Wired the historical validator into the root build so future visual passes fail fast if they lose the Kom el-Fakhry / Mit Rahina settlement anchor, the early Ptah / Hwt-ka-Ptah endpoint, the mudbrick/plaster domestic read, or the no copied-media policy.
- Historical guardrail: this pass made no scene-layout or art additions. It formalizes the rules that future cinematic-quality work must satisfy.

### 2026-08-06: After Quality Works, Optimize

- Kept the approved Hero Street v2 placement and visual direction intact; no houses, roads, walls, props, or route coordinates were moved.
- Added runtime quality profiles: balanced default, `?quality=performance` laptop-safety mode, and `?quality=cinematic` inspection mode.
- Changed modular GLB loading so critical hero-street chunks and animated actors load before optional Nile/reed detail, letting the street become interactive earlier while preserving the full composition as deferred detail.
- Added `content/optimization/browser-runtime-budget.json` plus `npm run validate:optimization` to enforce active GLB, fallback GLB, and texture budgets.
- Wired optimization validation into the root build after content and historical validation.
- Historical guardrail: optimization changes preserve the Kom el-Fakhry / Mit Rahina anchored Old Kingdom domestic street, the early Ptah endpoint, the near/mid/far chunk source of truth, and the no copied-media policy.

### 2026-08-06: Step 1 Hero Shot Paintover Pass

- Added `content/scene-data/hero-street.paintover.json` as the machine-readable paintover target for the locked canonical shot.
- Added a development-only browser overlay at `?shot=hero-street-main&paintover=1&chrome=0`.
- Added validation that keeps the paintover tied to `hero-street-camera-lock` and the active `hero-street-main` shot.
- Added `docs/design/hero-shot-paintover-pass-v1.md` to define the paintover target, historical restraint, acceptance checks, and next-pass usage.
- Historical guardrail: no district placement, house position, route, gate, temple, or runtime art content was moved. The pass defines how to judge the existing street before more visual polish.
