# Memphis Hero District Plan

Scope: a compact, historically plausible early dynastic / Old Kingdom Memphis district for the browser MVP. The plan is a production layout guide, not a claim of an excavated street plan.

## Coordinate System

Babylon scene coordinates:

- `x`: west/east cross-street axis. Nile is west at negative `x`.
- `z`: route depth from Nile arrival south/north through the district.
- `y`: height.

Primary route spine:

| Segment | Approx. Centerline | Function | Art Direction |
| --- | --- | --- | --- |
| Nile landing | `x -47 to -29`, `z -56 to -38` | Boats, quay, cargo, river approach | Dense moored boats, reeds, palms, jars, water haze. |
| White Walls gate | `x -31 to -6`, `z -34 to -29` | Transition into city | White-plastered mudbrick edge, controlled threshold, no clutter blocking route. |
| Hero residential street | `x -15 to -6`, `z -28 to 34` | Main cinematic corridor | Two continuous house rows, doors/facades inward, props along edges, clear walking lane. |
| Craft/market threshold | `x 2 to 20`, `z 0 to 32` | Background activity | Worktables, pottery, stone/copper work, optional next phase. |
| Monument approach | `x -12 to 12`, `z 48 to 92` | Early Ptah / Hwt-ka-Ptah endpoint | Larger, calmer, cleaner temple approach with evidence markers. |

## Hero Street Rules

The hero street is the visual priority for this milestone.

- Street centerline: approximately `x -10.5`.
- Walking lane: keep `x -13.8 to -7.2` mostly clear.
- Left/west house row: facade faces east/inward toward positive `x`.
- Right/east house row: facade faces west/inward toward negative `x`.
- Doors, awnings, benches, jars, baskets, work surfaces, and people face or occupy the street edge.
- Props should live against facades, not in the centerline, unless they are deliberate foreground composition.
- Animated actors should read as part of the street composition: walkers near the centerline, carriers in the lane, and idle/work loops close to doorways or work blocks.
- No second architecture system may overlap the hero street. The authored GLB corridor is the source of truth for houses in this segment.

## Historical Compliance Notes

Use conservative early dynastic / Old Kingdom visual language:

- Domestic architecture: mudbrick massing, flat roofs, parapets, small openings, simple doors, plaster patches, roof storage.
- Clothing: simple linen kilts, wrap skirts, sheath-like dresses, bare torsos for workers, dark hair/wigs as low-detail placeholders.
- Materials: mudbrick, packed dust, plaster, limestone, wood, reeds, linen, pottery, baskets, mats, rope.
- Decoration: minimal domestic painted bands and plaster treatment; avoid later monumental fantasy unless marked speculative.
- Uncertain details remain evidence-labeled as inferred or speculative in the app.

## Implementation Source Of Truth

- District plan: this file.
- Runtime route: `content/scene-data/memphis-white-walls.tour.json`.
- Hero street GLB: `/assets/generated/glb/hero_street_corridor.glb`.
- Animated actor GLB: `/assets/generated/glb/animated_street_actors.glb`.
- Asset generator: `tools/blender/generate_memphis_asset_kit.py`.
- Runtime placement: `apps/web-tour/src/scene/MemphisWhiteWallsScene.ts`.
