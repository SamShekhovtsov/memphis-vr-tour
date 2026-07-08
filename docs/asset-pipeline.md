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

## Current Browser Asset Kit

The first high-detail browser pass now uses project-authored GLB modules generated from Blender:

- Generator: `tools/blender/generate_memphis_asset_kit.py`
- Runner: `npm run generate:glb`
- Output: `apps/web-tour/public/assets/generated/glb/`
- Manifest: `apps/web-tour/public/assets/generated/glb/asset-kit.manifest.json`

The current kit covers the requested first priorities:

- Nile arrival: detailed cargo boats, palms, reed-bank clusters, cargo, baskets, and Nile-side figure placeholders.
- Residential street: mudbrick house clusters, parapets, stairs, awnings, jars, mats, baskets, benches, painted panels, and simple NPC placeholders.

Babylon assembles these GLBs into the existing world. The generated meshes are intentionally lightweight for laptop browsers and are provenance-tracked through `content/processed/runtime-assets.manifest.json`.

## Reference Image Handling

The local files under `D:\Projects\EgyptVRTourResources\CityMemphis\Memphis*.jpg` are treated as user-provided art-direction references only unless a compatible license is documented later. They should not be copied into runtime assets, uploaded to third-party generators, used for model training, or treated as historically verified evidence without a separate rights and source review.

The first GLB kit is therefore procedural/project-authored: it uses the reference images only to guide human visual priorities such as density, river arrival, white/mudbrick massing, awnings, crowds, and warm cinematic lighting.

## Compression Notes

The current checked-in GLBs are small enough for the browser MVP and are not Draco-compressed yet, because Draco requires adding and testing the browser decoder path. KTX2 texture compression is also deferred until the generated texture set is stable. When enabled, compression should be added as an optional pipeline step and verified in Babylon before being required by deployment.

## AI Boundaries

- Use existing image, video, text, and 3D models.
- Fine-tune small adapters or LoRAs only on content that is licensed or otherwise allowed for that purpose.
- Use retrieval for Egyptian history and language instead of assuming the model knows the period.
- Keep confirmed, inferred, and speculative labels attached to generated assets.

## Source Policy

See [Step 3 Source And ML Policy](research/step-03-source-and-ml-policy.md) and the source register at `content/source-references/memphis-source-register.json`.

Important rule: material that is not shown directly in the app may still be restricted for model training, embedding, or upload into third-party generation tools. Use CC0, public-domain, owned, commissioned, or explicitly ML-permitted sources for datasets and fine-tuning.
