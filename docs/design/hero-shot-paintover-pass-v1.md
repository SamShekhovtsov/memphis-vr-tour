# Hero Shot Paintover Pass v1

Purpose: create one fixed visual target for Hero Street v2 before the next lighting, material, and wall-quality passes.

This pass does not move the district, street, road, houses, gates, route, or temple. It defines the camera and paintover overlay that future quality work must compare against.

## Source Files

- Camera lock: `content/scene-data/hero-street.camera-lock.json`
- Paintover spec: `content/scene-data/hero-street.paintover.json`
- Art direction: `docs/design/hero-street-art-direction-v1.md`
- Compliance guardrail: `docs/research/hero-street-visual-compliance/README.md`

## Locked Shot

- Browser URL: `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`
- Paintover URL: `http://127.0.0.1:5573/?shot=hero-street-main&paintover=1&chrome=0`
- Position: `[-6.6, 1.65, -18]`
- Look at: `[-6, 1.48, 8]`
- Viewport: `1280x720`

## Paintover Targets

The overlay marks ten target areas:

1. Overhead linen shadow frame.
2. Left foreground wall and object frame.
3. Right foreground human scale.
4. Clear lane spine and vanishing point.
5. Continuous packed-dust ground read.
6. Left doorway darkness pockets.
7. Right doorway darkness pockets.
8. Wall-base grime and contact shadows.
9. Warm sun strips and cooler shade.
10. Two to three strong human silhouettes.

These are art-direction zones, not new runtime objects. Future passes should use material, light, shadow, atlas, and animation polish to make the existing street satisfy them.

## Historical Guardrail

Keep the pass visually restrained:

- Domestic mudbrick and plaster/whitewash walls.
- Packed dust, clay pottery, reed/wood, linen, baskets, simple tools.
- Plain linen kilts or sheath-like linen garments.
- Bare feet or simple sandals.
- Minimal adornment.
- No later temple excess, fantasy monuments, royal costume, or copied media.

## Acceptance

The pass is complete when:

- `npm run qa:hero-camera` prints both the canonical shot URL and paintover URL.
- `npm run validate:content` validates the paintover against the locked camera.
- The paintover overlay appears only when `paintover=1` is present.
- The regular tour remains unchanged when `paintover` is absent.
