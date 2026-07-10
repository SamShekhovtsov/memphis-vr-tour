# Hero Street v2 Cinematic Plan

Goal: make one dense 20-30 meter street slice beautiful at player eye height before expanding the district.

## Locked Composition

- Keep the current district placement from `docs/design/hero-street-v2-layout-lock.md`.
- The route should feel indirect: Nile arrival, White Walls threshold, a right turn, then the visitor enters the offset residential lane.
- Do not move the sandy hero road, GLB street corridor, route stops, or district plan independently.

## Art Target

- A compact Old Kingdom / early Memphis residential lane inspired by mudbrick settlement evidence, not a fantasy monumental boulevard.
- Close facades, low rooflines, parapets, small openings, plaster patches, linen shade cloth, baskets, jars, work tables, dust, straw, footprints, and doorway darkness.
- Fewer stronger characters: two or three readable figures near the player beat many small placeholders.
- The cinematic reference images guide camera language, density, dust, light, and human scale. They should not be copied literally when they show later New Kingdom or fantasy-monument details.

## Historical Guardrails

- Architecture should stay domestic and mudbrick-heavy: uneven walls, whitewashed/plastered patches, compact rooms, roof activity, narrow lanes, storage jars, baskets, work tables, and small door/window openings.
- Clothing should remain restrained: plain linen kilts, simple sheath-like linen garments, bare feet or simple sandals, minimal jewelry, simple hair silhouettes, and no late-period fashion excess unless explicitly marked speculative.
- Art and wall markings should be limited and contextual: domestic plaster marks, simple painted bands, workshop marks, and small shrine/amulet motifs are safer than heavy temple-style wall painting in the street.
- Temple or Ptah-precinct elements should stay in the distance/endpoint until the shrine phase; the hero street is a living-city slice, not a monumental processional avenue.
- Evidence view must keep the distinction between confirmed, inferred, and speculative visible.

## Quality Ladder

1. Camera-framed hero slice: one eye-height composition with foreground occluders, overhead linen, strong vanishing point, and a controlled first-person path.
2. Sculpted building pass: bevels, warped parapets, cracked plaster lips, eroded mudbrick corners, hand-sized openings, roof clutter, cords, pegs, and threshold darkness.
3. Ground contact pass: true height variation, footprints, ruts, pebbles, straw, broken pottery, swept dust piles, object contact shadows, and darker dirt along wall bases.
4. Hero prop pass: close-up baskets, jars, stools, tools, work blocks, linen piles, ropes, awning knots, and small food/craft details.
5. Character pass: two walking characters plus one worker, with readable silhouettes, rooted feet, simple Old Kingdom clothing, and slower human timing.
6. Baked light pass: Blender-baked warm sun, ambient occlusion, doorway darkness, awning shadows, prop grounding, and color-graded haze.
7. Optimization pass: near/mid/far chunks, LODs, texture atlases, KTX2, and decoder-backed Draco/Meshopt only after the film-set look is correct.

## Runtime Strategy

- Babylon assembles the scene and displays the current authored GLB kit.
- The active v2 pass uses the authored `hero_street_corridor.glb` as the source of truth. Babylon's procedural film-set overlay remains a fallback only if the GLB kit cannot load.
- The Blender pass bakes close-up film-set detail into the GLB: contact shadows, wall stains, cloth shadows, foreground props, tools, pebbles, roof clutter, and three stronger human silhouettes.
- The next optimization pass should split the hero street into near/mid/far chunks with optional decoder-backed compression.

## Current Implementation Pass

- Street placement is locked by `docs/design/hero-street-v2-layout-lock.md`; do not move the houses, yellow street road, or route stops while improving art.
- The current GLB generator builds one eye-height film-set composition: foreground wall occluders, foreground baskets/jars, a low sagging linen canopy, a strong narrow lane, and depth haze planes.
- Facade chunks now include eroded mudbrick lips, chipped parapets, door reveals, dark thresholds, wall pegs, cords, plaster patches, wall stains, and roof clutter.
- Ground detail now includes swept dust, paired footprints, soft ruts, pebbles, straw, broken pottery, raised dust clods, wall-base dirt, and baked contact-shadow decals.
- The hero corridor no longer adds static distant human figures; human life should come from the separate animated actor GLB so the scene does not mix static statues with moving figures.
- The animated actors remain browser-safe articulated GLB figures for now, with plain linen kilts or sheath-like linen clothing, bare feet/simple sandals, minimal adornment, and slow walking/work loops.

## Material Strategy

- Runtime synthetic textures remain project-generated and license-safe.
- Required material sets for the Blender pass: mudbrick, dust, plaster, wood, linen, pottery, reed, skin, limestone.
- Each finished set should have at least albedo, normal, roughness, and AO. Height/decals are preferred for cracked plaster and ground contact dirt.

## Lighting Strategy

- Current Babylon pass uses warm sun, haze, tone mapping, and contact-shadow planes.
- Next authored pass should bake warm low-sun shadows into a hero-street lightmap: doorway darkness, cloth shade, wall-foot contact, table/prop occlusion, and figure grounding.

## Performance Target

- Keep the hero street as chunks, not one giant monolith.
- Draco export is wired as an opt-in generator mode with `EGYPTVR_ENABLE_DRACO=1`, but runtime builds keep it off until Babylon decoder loading is verified.
- Use LOD, Meshopt/Draco, and KTX2 after the visual target is reached.
- Preserve laptop-browser usability before adding more district scale.
