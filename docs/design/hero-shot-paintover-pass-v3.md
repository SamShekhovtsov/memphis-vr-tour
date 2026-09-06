# Hero Shot Paintover Pass v3

Purpose: push the locked hero street shot closer to cinematic quality by replacing clean procedural reads with controlled imperfection: mud, dust, scuffed walking wear, chipped plaster, darker wall-base grime, and stronger contact detail.

This remains a paintover and production contract, not a district expansion. It does not move the approved street, houses, sandy road, gates, route, or Ptah endpoint.

## Locked Shot

- Canonical URL: `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`
- V3 paintover URL: `http://127.0.0.1:5573/?shot=hero-street-main&paintover=v3&chrome=0`
- Position: `[-6.6, 1.65, -18]`
- Look at: `[-6, 1.48, 8]`
- Viewport: `1280x720`
- V3 output: `docs/design/screenshots/hero-street-paintover-v3.jpg`

## What V3 Changes

V2 identified the major composition and material zones. V3 makes the quality bar more specific:

- The ground must read as a continuous lived-in surface, not a clean yellow strip.
- Mud/dust variation should be clustered and directional: foot ruts, dried Nile-silt scuffs, swept dirt, straw, pebbles, and pottery chips.
- Close walls need age from use: low splashes, hand-height smudges, chipped plaster lips, exposed daub only in damage, and darker dirt at bases and door edges.
- Contact detail is a primary quality lever: walls, jars, posts, baskets, benches, and feet need soft grounding.
- Imperfection must be art-directed, not noisy. The shot should feel handmade and historical, not cluttered.

## V3 Scoring

| Area | Weight |
| --- | ---: |
| Ground realism and contact detail | 20 |
| Controlled randomness, mud, dust, wear | 18 |
| Wall/plaster material realism | 18 |
| Warm sun, cooler shade, depth haze | 16 |
| Foreground frame and vanishing point | 12 |
| Few believable Old Kingdom humans | 10 |
| Early Memphis / Old Kingdom restraint | 6 |

## Historical Guardrail

Keep the street domestic and restrained:

- Mudbrick is the construction system, but visible house facades should mostly read as mud-plastered or whitewashed earthen walls.
- Use packed earth/dust, clay pottery, reed/wood, baskets, mats, plain linen, small openings, flat roofs, and simple work surfaces.
- Use exposed mudbrick/daub only as failure, repair, corner damage, and chipped substrate.
- Ordinary people should wear plain linen kilts or sheath-like linen garments, bare feet or simple sandals, restrained hair, and minimal jewelry.

Avoid:

- Regular exposed block-grid wallpaper across every house.
- New Kingdom/Ptolemaic temple language in the domestic lane.
- Royal collars, crowns, armor, fantasy color palettes, or copied media.
- More objects before material, lighting, contact, and silhouette quality improve.

## Implementation Targets

1. Regenerate the hero ground atlas with darker compacted dust, dried silt scuffs, irregular ruts, footprints, straw scratches, pebbles, and small debris.
2. Regenerate plaster/mudbrick atlases with more wall-base dirt, chips, scumble, hairline cracking, and less clean repetition.
3. Add non-colliding Blender decals for low mud splashes, wall grime, chips, settlement scratches, and contact shadows; ground marks should use irregular organic polygons, not visible rectangular overlay sheets.
4. Keep the Main Wall-side street-mouth clearance open and walkable.
5. Capture and compare the V3 paintover and canonical shot from the locked camera.

Successful V3 means the current browser shot begins to feel like a physical dusty street surface with imperfect plastered walls, even before any larger character or lighting rebuild.
