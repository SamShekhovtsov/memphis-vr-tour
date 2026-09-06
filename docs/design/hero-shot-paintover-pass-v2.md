# Hero Shot Paintover Pass v2

Purpose: sharpen the fixed-shot target so the next quality passes can move the browser scene toward the user's cinematic references without copying protected imagery or drifting out of Early Dynastic / Old Kingdom Memphis.

This is a paintover contract, not a district expansion. It does not move the approved street, houses, road, gates, route, or Ptah endpoint.

## Locked Shot

- Canonical URL: `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`
- V2 paintover URL: `http://127.0.0.1:5573/?shot=hero-street-main&paintover=v2&chrome=0`
- Position: `[-6.6, 1.65, -18]`
- Look at: `[-6, 1.48, 8]`
- Viewport: `1280x720`
- V2 output: `docs/design/screenshots/hero-street-paintover-v2.jpg`

## What V2 Changes

V1 identified broad quality zones. V2 is more opinionated:

- The street needs a stronger top shadow frame, like practical linen shade cloth entering the camera view.
- The left and right foreground walls must become the material-quality proof: plaster depth, rounded edges, dirt, chips, and dark recesses.
- The ground must stop reading as a repeated road strip and start reading as compacted dust with footprints, ruts, straw, chips, pebbles, and contact grime.
- The shot needs a small number of believable people, not more placeholders.
- Sun and shade must separate clearly: warm sun, cooler shade, darker dirt, pale linen, matte clay pottery.

## V2 Scoring

Use these weights after every screenshot capture:

| Area | Weight |
| --- | ---: |
| Ground realism and contact detail | 20 |
| Wall/plaster material realism | 20 |
| Warm sun, cooler shade, depth haze | 20 |
| Foreground frame and vanishing point | 15 |
| Few believable Old Kingdom humans | 15 |
| Early Memphis / Old Kingdom restraint | 10 |

## Historical Guardrail

The attached cinematic references are useful for density, lens language, light, and emotional goal. They are not direct historical evidence and must not be copied.

Keep:

- Domestic mudbrick construction with plaster/whitewash surface read.
- Flat roofs, small openings, plain thresholds, roof storage, simple reed/wood/linen details.
- Packed earth/dust, clay pottery, baskets, sacks, simple work surfaces.
- Plain linen kilts or sheath-like linen garments, bare feet/simple sandals, restrained hair, minimal jewelry.

Avoid:

- Regular exposed block grids across every house facade.
- New Kingdom/Ptolemaic monumental temple vocabulary inside the domestic lane.
- Royal costume, fantasy collars/crowns, decorative gold/purple palettes, or cinematic spectacle that breaks the ordinary Old Kingdom street.
- More props before material, light, and silhouette quality improve.

## Next Implementation Target

The immediate next art pass should use this paintover in this order:

1. Move existing awning/shade silhouette into the top frame and tune it darker.
2. Rebuild foreground plaster/wall material response from the locked shot.
3. Rebuild the hero ground atlas and contact AO.
4. Push doorway darkness and wall-base grounding.
5. Restore two or three strong walking/working human silhouettes.

The work is successful when the canonical screenshot feels less like a layout prototype and more like one dense, believable film-set slice of an Old Kingdom Memphis residential lane.
