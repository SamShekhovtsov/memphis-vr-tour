# Hero Street v2 Layout Lock

This file locks the current hero street placement. Do not move one part of the street independently from another.

## Locked Coordinates

- Hero street GLB group offset: `heroStreetOffsetX = -16.5`
- Hero street sandy road center: `heroStreetCenterX = -6`
- White Walls threshold stop: position `[-7, 1.7, -31]`, lookAt `[-6, 1.6, -18]`
- Kom el-Fakhry street stop: position `[-6, 1.7, -12]`, lookAt `[-6, 1.6, 10]`
- Craft threshold stop: position `[-2, 1.7, 22]`, lookAt `[2, 1.6, 42]`

## Placement Intent

The street is intentionally offset to the right of the Nile-side White Walls gate opening. Visitors should not walk straight from the entrance gate directly into the residential street. The intended route is:

1. Arrive at the Nile-side landing.
2. Pass through the White Walls threshold.
3. Turn into an offset side street with dense houses and market life.
4. Continue toward the craft/temple approach.

## Production Rule

When changing street placement, move these together:

- `heroStreetOffsetX`
- `heroStreetCenterX`
- the White Walls / Kom el-Fakhry / craft route stops
- the district plan ranges in `docs/design/memphis-hero-district-plan.md`

Never move the yellow road without the houses, and never move the GLB houses without the road.

