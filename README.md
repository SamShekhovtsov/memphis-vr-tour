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
