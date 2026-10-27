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
