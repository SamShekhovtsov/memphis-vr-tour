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
