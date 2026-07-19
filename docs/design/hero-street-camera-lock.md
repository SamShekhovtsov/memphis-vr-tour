# Hero Street Camera Lock

This file explains the canonical camera benchmark for the current street-quality pass. The source of truth is:

`content/scene-data/hero-street.camera-lock.json`

## Purpose

Use one fixed eye-height camera for every visual-quality comparison. This prevents accidental progress drift: texture, lighting, haze, plaster, mudbrick, and ground changes should be judged from the same shot before changing composition or adding objects.

## Canonical Shot

- Shot id: `hero-street-main`
- URL: `http://127.0.0.1:5573/?shot=hero-street-main&chrome=0`
- Alias URL: `http://127.0.0.1:5573/?shot=canonical&chrome=0`
- Viewport: `1280x720`
- Position: `[-6.6, 1.65, -18]`
- Look at: `[-6, 1.48, 8]`
- Canonical output: `docs/design/screenshots/hero-street-main-current.jpg`

## Runbook

1. Start the web app on port `5573`.
2. Open the canonical URL above.
3. Capture the shot at `1280x720` with the HUD hidden by `chrome=0`.
4. Compare only against previous captures from this same camera.
5. Do not move the district, street, houses, road, gate, or temple while judging texture/material quality.

Quick command:

```bash
npm run qa:hero-camera
```

## Quality Use

This camera is for the current cinematic-quality pass, especially:

- Ground atlas realism and visible tiling/banding.
- Mudbrick/plaster color, roughness, pitting, stains, and cracks.
- Doorway darkness and wall-base contact shadows.
- Warm sun, cooler shadow, reduced white haze, and clay/pale-linen palette.
- Early Memphis / Old Kingdom restraint.

## Change Rule

Do not change the canonical shot unless the user explicitly approves a new camera benchmark. If it changes, update all of these together:

- `content/scene-data/hero-street.camera-lock.json`
- `docs/design/hero-street-camera-lock.md`
- `docs/design/hero-street-art-direction-v1.md`
- any current comparison screenshots in `docs/design/screenshots/`
