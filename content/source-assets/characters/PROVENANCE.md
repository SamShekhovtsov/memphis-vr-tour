# Rigged human sources

Downloaded 2026-10-22 from Innerscene's CC0 3D parts library:

- Male: https://www.innerscene.com/tools/library/3d-parts/male-base-mesh-3d-person-rigged-a-pose-380e6d89
- Female: https://www.innerscene.com/tools/library/3d-parts/female-base-mesh-3d-person-rigged-a-pose-dba97ed5

Both asset pages expressly dedicate these MakeHuman-derived meshes and rigs to
CC0, permitting modification and redistribution, including commercial use.
See https://creativecommons.org/publicdomain/zero/1.0/ and the original core-asset
license explanation at https://static.makehumancommunity.org/about/license.html.
Source GLBs are kept here; output manifests record their SHA-256 hashes.

Project adaptations: offline mesh reduction, skin/linen/hair materials, wrapped
linen clothing and rig-driven runtime motion. The assets are anatomical bases,
not scans of identified people or evidence for specific ancient individuals.

Clothing is restrained artistic reconstruction informed by the Met's discussion
of Old Kingdom kilts and shoulder-supported linen slips:
https://resources.metmuseum.org/resources/metpublications/pdf/The_Daily_Life_of_the_Ancient_Egyptians_The_Metropolitan_Museum_of_Art_Bulletin_v_31_no_3_Spring_1973.pdf
Linen material evidence: https://www.metmuseum.org/art/collection/search/570883

Step 6 (25 October 2026): `hero-fit-baseline.bin` retains the original existing
wrap POSITION/NORMAL/JOINTS_0/WEIGHTS_0 streams for reversible project-authored
clearance and garment-weight refinements. It is derived from these same CC0
adaptations. No additional external character or texture source was introduced.
The explicit stream hashes and portable fit recipe are recorded in
`content/scene-data/hero-street.steps56-revision.json`.

### Crowd LODs — 26 October 2026

The crowd-male/female-lod1/2 Blender files derive from the current hero GLBs, preserving their existing CC0 anatomy and project-authored clothing/material provenance. tools/blender/build_crowd_lods.py preserves skinned joints, UVs and vertex colours. Runtime LOD source hashes, triangle counts and bounded four-weight body-pose errors are recorded in apps/web-tour/public/assets/authored/people/crowd/manifest.json; clothing weights are retained. Original full-detail GLBs are unchanged.

### Character-art steps 1–2 — 27 October 2026

Same original CC0 anatomical sources; no new external characters or textures. The project-authored continuous bodice and bounded wrap clearance replace copied damaged garment faces. Connected reference anatomy is rebuilt using Blender 5.1 glTF import with merge_vertices=True before 0.24 reduction; zero boundary edges on both complete reference bodies. Final runtime bodies deliberately omit only pose-tested concealed triangles. Separate eye colours/material and connected cropped scalp are project adaptations. Editable character-art-male/female.blend, clean reference GLBs, topology/coverage reports and four rebuilt crowd Blender LOD files are retained. Use npm run build:character-art (or build:people), optionally CHARACTER_ART_BLENDER_BIN pointing to Blender 5.1. The driver runs prepare_character_reference.py, character_art_pass.py, pose audit, LOD export and bounded revision recording/validation. Original sources, PBR maps and rigs remain portable; engine lighting and animation playback require calibration/integration. Historical statements above describe their dated revisions.

### Character surfaces, steps 3–4 — 27 October 2026

No additional external assets. `tools/build-character-surfaces.py` authors deterministic skin pigment/roughness, restrained pore normals, cropped-scalp strand/clump response and linen plain-weave PBR maps. The accepted CC0 male anatomical UVs provide a common atlas guide; this is stylized anatomical pigment, not scanned or individual-specific skin. No directional light/AO is painted into the maps. The existing male/female geometry, joints, UVs, weights, clothing clearance and source Blender files remain byte-identical.

Editable lossless source maps are in `surfaces-v2/*.png`, with exact lossless WebP runtime copies under `apps/web-tour/public/assets/authored/people/surfaces-v2`. Reproduce with Python + NumPy + Pillow: run tools/build-character-surfaces.py then tools/verify-character-surfaces.py. The manifest describes all UV transforms, glTF tangent normal convention, sRGB albedo and linear normal/ORM packing. Use white base factor multiplied by existing linear vertex RGB. Skin albedo/ORM use original UV0 once; pore normals repeat 16 times. Cropped-scalp UV scale .18 and offset .5 for both axes; linen UV scale1. Babylon normal inversion follows scene handedness; native engine importers must calibrate their tangent convention. Balanced uses six maps and scalar roughness; cinematic uses nine maps plus restrained existing hair anisotropy/cloth sheen. No transmission, extra pass or alpha hair cards are added. Existing cropped silhouettes and garment drape remain limitations for later art work.

### Character actions, user-defined steps 5–6 — 27 October 2026

No new external media or character sources. Original CC0 rigged anatomy, all editable Blender geometry, clothing clearance, maps, UVs, weights and glTF scale remain unchanged. Project-authored action timing and asymmetric hand shapes live in CharacterActionPose.ts; CharacterContactTargets.ts uses real visible static triangles and reach checks. HeroPeople retains original load/block geometry and adds contact-gated body coordination. No fake carried prop or inventory state is introduced.

CharacterEyelids.ts derives eye centres from the original geometry and deforms only the existing skin rims for blinks; it adds no eye overlay, mesh, map or draw pass. InstancedDistrictCrowd retains the same rigs and GPU skinning while recording richer action/idle atlases and interpolating at most six nearby residents into spare rows. This browser presentation is not a portable exported animation pack: native-engine importers need to bake/retarget the authored action recipe and adapt the eye-rim deformation or use proper eyelid morphs. All original source and material provenance remains valid.
