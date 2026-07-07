# Engine Targets

## Browser MVP

Use Babylon.js as the first runtime because it gives the project a fast, shareable WebGL/WebXR path. Browser access matters because many users will not own a powerful headset.

The browser build should support:

- desktop and mobile browser walkthrough controls
- WebXR entry when a compatible headset/browser is available
- route playback for a 2 to 5 minute guided walk
- first-person free movement
- evidence overlay
- narration state
- progressive asset loading later

## Full VR Target

Unreal is the primary high-fidelity target for now. The repo includes an Unreal project shell under `engines/unreal` so the full VR experience can grow from the same content base instead of becoming a separate product.

The Unreal target should eventually handle:

- high-density architectural reconstruction
- physically based lighting and materials
- volumetric incense, dust, and river atmosphere
- PC VR and standalone headset performance tiers
- authored NPC animation and spatial audio
- comfort settings such as snap turn, vignette, locomotion mode, and seated/standing height

## Unity Adapter

Unity is kept as a possible adapter under `engines/unity`, not as a second MVP. If the project later needs Unity-specific headset support, mobile deployment, or team expertise, it can import the same scene manifests and processed assets.
