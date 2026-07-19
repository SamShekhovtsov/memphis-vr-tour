# Content Workspace

This folder is the shared base for both browser and full VR builds.

- `source-references`: reviewed references, citations, licensing notes, and provenance.
- `scene-data`: route, scene, evidence-adjacent manifests, and camera locks consumed by runtimes.
- `generated`: AI drafts and intermediate outputs. Ignored by git.
- `processed`: optimized runtime assets. Ignored by git unless intentionally tracked.
- `style-guides`: creative and historical direction.

Do not place arbitrary scraped media here. Step 3 of the project will decide what can be used for model study, retrieval, inspiration, or direct runtime display.

Current visual QA lock:

- `scene-data/hero-street.camera-lock.json` defines the canonical hero street camera for texture/material/light quality passes.
- Use `npm run qa:hero-camera` to print the locked URL, viewport, camera position, look-at target, and canonical screenshot output.
