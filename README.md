# Egypt VR Tour

Ancient Memphis: A Walk Through the White Walls is the first project slice for a VR-ready living-history walkthrough. The same historical scene data, evidence tags, and asset manifests should feed both the browser experience and the full-fidelity headset build.

## Current Targets

- `apps/web-tour`: Babylon.js + Vite browser MVP using WebGL/WebXR.
- `engines/unreal`: Unreal target shell for high-fidelity PC VR and standalone headset production.
- `engines/unity`: reserved adapter notes in case Unity becomes the better delivery target later.
- `packages/shared-scene`: shared TypeScript contracts for route, evidence, scene, and provenance data.
- `content`: source references, scene manifests, generated assets, and processed runtime assets.

## First Run

```bash
npm install
npm run dev
```

The web app is the first runnable target. It starts with a procedural placeholder scene for Memphis around the Early Dynastic / Old Kingdom concept: Nile arrival, mudbrick street, craftsmen area, temple exterior, painted interior, ambient NPC routines, optional narration state, and an evidence overlay mode.

## Project Principle

The product can be cinematic and beautiful, but every reconstructed element should be tracked as one of:

- confirmed
- inferred
- speculative

That lets the experience stay immersive while still being honest about where evidence ends and reconstruction begins.

## Desktop movement and residents

WASD or arrows walk on the ground, independently of view pitch. Hold **F** with movement keys for view-directed flight; while F is held, Space rises and Ctrl descends. Release F to land safely. Houses are solid. 126 residents now populate the district, with varied destinations, pauses and turns. The original nine retain live rigs and IK; 117 added residents share GPU animation and distance-based character LODs.

See [interaction fixes, matched screenshots and desktop measurements](docs/design/district-interactions-2026-10-25.md). Run `npm run qa:district-interactions` against the dev server on port 5573 to repeat the live regression checks.

## Image clarity

Balanced keeps native resolution and uses a shared-sample FXAA/detail resolve with selective 4x authored colour-map filtering and 8x ground-colour filtering. The line-preserving resolve uses gentler sharpening to limit halos. Cinematic retains 4x MSAA and 8x authored colour filtering. The route overlay is opt-in with `?routeGuide=1`. See [matched quality comparisons and HD 4600 measurements](docs/design/hero-street-image-quality-2026-10-25.md).

See the [180-person crowd and clarity comparison](docs/design/crowd-and-clarity-2026-10-26.md). Diagnostic `?crowd=small` restores nine residents; `&clarity=previous` selects the previous edge resolve and ground filter for comparisons. Added residents use full geometry nearby and real skinned LODs at 8 m and 20 m.

## Population areas and automatic steps

Current allocation: 51 people inside the Ptah temple, 50 in the hero village lane, 19 on the remaining arrival route, and 6 in open space. This is a 30% cut from 180, with whole-person rounding of 40/40/15/5 percent. Regions and weights are in `content/scene-data/district-population.json`; NPCs wander within those areas. Zone edges are routing rules and add no visitor collision walls.

Walk normally to step up or down low obstacles automatically (maximum rise 38 cm). The arrival quay and tilted ramp provide actual support. Tall walls and low ceilings still block traversal; hold F remains the explicit flight override. See [population, step-up evidence and final views](docs/design/population-zones-and-steps-2026-10-27.md).

## Purposeful resident behavior

Half of the population (63 of 126) now has stable roles and personality traits, committed activities, limited-capacity work/rest places, physical waiting slots, paired conversations and intent-driven shared GPU gestures. The 51/50/19/6 area allocation remains unchanged. No model download, inference server, paid API or added live skeleton is required. See [six-step implementation and measurements](docs/design/purposeful-residents-2026-10-27.md). Diagnostic `?intelligence=legacy` restores random-goal behavior for comparisons; geometry, camera and rendering settings are unchanged.

## Character realism steps 1–2 — 27 October 2026

Garment coverage and connected male/female reference anatomy are complete. The corrected Blender 5.1 import merges glTF vertices before reduction, repairing torn faces/body surfaces. Eyes have a separate opaque material; cropped scalp and crowd LODs are rebuilt. `npm run build:people` now uses the corrected character-art pipeline. Population, behavior, placements, navigation and stored cameras are preserved. Full build and 14 pose checks pass. Matched screenshots, performance and remaining art limitations: [character-art report](docs/design/character-art-steps-1-2-2026-10-27.md). HD4600 balanced median/p95: 47.7/81.1 → 39.9/67.3 ms; cinematic: 67.5/123.9 → 57.6/111.4 ms. No deployment.

## Character skin, hair and linen steps 3–4 — 27 October 2026

The accepted character geometry, positions, behavior, district and cameras are locked. The new surface pass adds anatomical skin pigment/roughness, finer cropped-scalp response and quieter linen weave. It uses the same six/nine resident maps by quality tier, with nine-map delivery reduced from 999,138 to 497,216 bytes. Matched balanced/cinematic portraits, street views, performance results and remaining art limits: [steps 3–4 report](docs/design/character-surfaces-steps-3-4-2026-10-27.md). `npm run validate:character-surfaces` checks the current maps and 79 locked files. No deployment.

## Character action and motion steps 5–6 — 27 October 2026

These are the user-clarified character steps: asymmetric authored contact/observation gestures, then coordinated body/idle motion, blinks and a measured six-resident interpolation pilot. They are not the older street roadmap's shadow/human-upgrade numbers. Population, task decisions, positions, route, district and cameras remain locked. [Matched images,30-second before/after previews and performance](docs/design/character-actions-steps-5-6-2026-10-27.md). HD4600 median/p95: balanced40.3/67.1→39.9/69.1ms; cinematic62.4/124.8→59.2/115.3ms. No added draws; pose texture storage +12.23MiB. No deployment.
