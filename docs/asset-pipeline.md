# Asset Pipeline

## Intent

Use AI and procedural tools to draft quickly, then curate aggressively. The project should not pretend generated content is evidence.

## Planned Flow

1. Collect license-reviewed references into `content/source-references`.
2. Record provenance and allowed use before any model study or asset generation.
3. Build a small historical database for Memphis, period, materials, architecture, language, clothing, rituals, river activity, and urban life.
4. Generate drafts for concepts, textures, props, painted walls, ambient audio, and NPC clothing.
5. Keep only assets that pass historical, visual, and technical checks.
6. Process accepted assets into runtime-ready formats under `content/processed`.
7. Feed both browser and Unreal from shared manifests.

## AI Boundaries

- Use existing image, video, text, and 3D models.
- Fine-tune small adapters or LoRAs only on content that is licensed or otherwise allowed for that purpose.
- Use retrieval for Egyptian history and language instead of assuming the model knows the period.
- Keep confirmed, inferred, and speculative labels attached to generated assets.
