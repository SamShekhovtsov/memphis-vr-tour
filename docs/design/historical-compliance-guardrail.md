# Historical Compliance Guardrail

Scope: Ancient Memphis, Early Dynastic / Old Kingdom living-city street around the Kom el-Fakhry / Mit Rahina evidence base and the early Ptah / Hwt-ka-Ptah endpoint.

## Current Rule

The hero street should use mudbrick as the domestic construction system, but the player-facing walls should mostly appear as mud-plastered or whitewashed earthen surfaces. The cinematic target has soft, irregular, repaired walls, not a clean grid of visible blocks.

## Residential Architecture

- Use compact mudbrick masses, flat roofs, simple parapets, small openings, wooden lintels/frames, reed/linen shade, roof storage, baskets, jars, mats, and packed-earth floors.
- Show exposed mudbrick or daub only where plaster has failed: corners, wall-base damage, chips, door edges, and rough repair patches.
- Avoid regular exposed stone/block-grid wall patterns on ordinary domestic buildings. That reads too modern, too monumental, or too stylized for the current Old Kingdom residential lane.
- Keep domestic facades plain and functional. Decorative marks should be restrained: plaster scumble, grime, simple bands, workshop marks, and small household/shrine hints.

## People And Objects

- Keep clothing simple: linen kilts, wrap skirts, sheath-like linen garments, bare feet or simple sandals, minimal jewelry, and simple hair/wig silhouettes.
- Keep tools and vessels earthy and practical: pottery, wood, reed, linen, basketry, ropes, work benches, grinding/work surfaces, and sacks.
- Avoid later-period palace or temple excess in the street pass unless explicitly marked speculative in the evidence system.

## Evidence Labels

- Confirmed: material categories and broad domestic construction patterns supported by archaeology or well-established Egyptian material culture.
- Inferred: district layout, exact house placement, object arrangement, daily routines, and color/lighting treatment.
- Speculative: specific people, conversations, exact surface weathering, exact route choreography, and cinematic atmosphere.

## Implementation Notes

- `tools/blender/generate_memphis_asset_kit.py` should keep large visible house masses on mud-plaster/plaster materials.
- `sun baked mudbrick` should be used for exposed cores, damage, jars, rough mud elements, or secondary structures, not as a repeated block-grid skin across the hero street facades.
- If a future material atlas creates a visible grid, reduce it or move it to damage masks only.
- The Step 7 chunked runtime must preserve these same surface rules in every near/mid/far hero-street export.

## Operational Gate

- Machine-readable rules live in `content/compliance/historical-compliance.rules.json`.
- Run `npm run validate:history` after visual, material, Blender, asset-manifest, evidence, or route changes.
- The root `npm run build` script runs `validate:history` after content validation, so historical drift should fail before the browser build completes.
- A pass means the current metadata, evidence labels, runtime asset notes, material-atlas notes, and hero-street GLB manifest still declare the Early Dynastic / Old Kingdom Memphis scope.
- A pass does not mean expert review is complete. It means the project has not obviously drifted into later-period, fantasy, copied-media, or generic Egyptian visual language.
