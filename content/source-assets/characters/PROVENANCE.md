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
