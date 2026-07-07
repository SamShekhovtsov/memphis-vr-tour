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
