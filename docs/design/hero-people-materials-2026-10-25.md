# Hero people: skin, hair and linen material pass

25 October 2026. This improves the existing three characters with shared material detail. Their positions, walking paths, poses/IK, rigs, district, lighting and three camera bookmarks remain unchanged. The visual gain is restrained at the locked street distance; this is not a claim of cinematic human quality.

## Implemented

- Skin: warmer nonuniform diffuse colour, gentle cheek/ear/joint pigment variation in bind-pose vertex colour, a fine generic pore normal tile, and restrained dielectric reflectance. Balanced uses roughness 0.64; cinematic adds the roughness map. Highlights come from the existing lights. No painted shine or emissive fill; full subsurface scattering is not implemented.
- Hair: dark-brown short-clump and strand detail with tangent normals. Balanced uses roughness 0.53; cinematic adds mapped roughness and mild anisotropy. The existing cropped cap silhouette and head weights are retained; this does not add individual hair strands/cards.
- Linen: irregular warp/weft detail, matte roughness and subtle hem/crease colour variation. Balanced uses roughness 0.94; cinematic adds mapped roughness and low fibre sheen. New UVs travel with the existing garment as it bends.
- Garment coverage: binary skin vertex alpha clips only covered torso/upper-thigh regions inside generous hem/waist margins. Arms, hands, head and lower legs are excluded by the bind-pose region checks. This reduces the conspicuous brown skin patches through the existing kilts without altering indices or weights. It is an alpha-test material mask, not alpha blending or cloth simulation. Existing garment fit/weighting can still need a dedicated geometry pass for other poses.

## Locks and validation

The original binary payload of each person GLB is retained byte for byte, including positions, normals, existing UVs, indices, joint IDs and weights. Only missing UV attributes and normalized RGBA8 material colour/coverage attributes are appended. Nodes, skin definitions, original material fallback values and scene transforms are checked separately. The original avatar loading/pose/IK code is hash-checked after removing exactly three material-binding additions. Seventy-one scene, ground, street, lighting, motion and camera files retain their hashes.

Balanced loads six 512² albedo/normal maps: 0.832 MB of runtime download and 8.0 MiB estimated RGBA8+mipmap texture storage. Cinematic also loads the three ORM maps, totaling 0.999 MB and 12 MiB. No extra draws or triangles are added. Shared people GLBs total 3.989 MB, within the existing 4 MB limit; they grew by approximately 0.30 MB for the material attributes. Storage estimates are not measured total GPU VRAM.

PNG sources and byte-verified lossless WebP delivery are retained. Albedo is sRGB; normal/ORM are linear. ORM blue is zero metallic and red is unused white, keeping lighting separate. Unit normals, roughness bounds, hashes and alpha-mask placement are checked. All three original/legacy-control screenshots match pixel for pixel.

## Matched views

| View | Before | After |
| --- | --- | --- |
| hero-street-main | [Before](screenshots/hero-street-main-people-materials-before.png) | [After](screenshots/hero-street-main-people-materials-after.png) |
| hero-street-material | [Before](screenshots/hero-street-material-people-materials-before.png) | [After](screenshots/hero-street-material-people-materials-after.png) |
| street-entry | [Before](screenshots/street-entry-people-materials-before.png) | [After](screenshots/street-entry-people-materials-after.png) |

[Before movement](screenshots/hero-street-main-people-materials-motion-before.motion.webp) · [After movement](screenshots/hero-street-main-people-materials-motion-after.motion.webp).

The static views freeze the same two-second animation time at 1280×720 balanced settings. The movement previews use the same 300-step/ten-second route segment; sampled compositor frames are playback previews, not game-FPS measurements. The midpoint comparison makes the reduced kilt breakthrough more apparent than the distant static view.

| Movement midpoint | Before | After |
| --- | --- | --- |
| Existing route | [Before](screenshots/hero-street-main-people-materials-motion-before.motion-midpoint.png) | [After](screenshots/hero-street-main-people-materials-motion-after.motion-midpoint.png) |

## Performance

The initial all-feature balanced test exceeded the 10% median budget (31.3 → 35.4 ms, +13.1%; p95 66.8 → 67.2 ms). The final balanced tier retains colour, normals and coverage while using constant family roughness and reserving the extra fibre lobes for cinematic. A redundant opaque-albedo lookup was removed from the skin shadow pass; the stock shadow shader did not apply the vertex coverage, so this retains the original opaque body shadow inside the garment. [Initial measurements](hero-people-material-initial-performance-2026-10-25.json) are preserved separately.

GPU: ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000416) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Route | Median run p50 | Median run p95 |
| --- | --- | --- |
| before | 26.5 ms | 56.6 ms |
| after | 32.6 ms | 72.8 ms |

Three alternating legacy/new material route sweeps on the same GPU, balanced 1280x720. Each run has 180 rendered frames, 169 timed intervals; report the median run p50/p95. Asset builds idle. Initial load excluded, LOD streaming included. Legacy disables new material/colour bindings on identical geometry; its three control images match the original baseline pixel for pixel. Short desktop samples, not sustained or headset qualification.

Ten-percent regression budget: **FAIL**. Median change 23.0%; p95 change 28.6%. Timing is noisy and spikes remain; short measurements cannot establish a speed-up. All 26 live collision checks pass, including the Ptah floors and approach crossings.

[Raw samples and checks](hero-people-material-results-2026-10-25.json).

## Rebuild and engine portability

Run tools/build-character-materials.py with Python/Pillow/NumPy. It can reconstruct the original attribute schema and binary prefix from the checked-in material lock if the ignored baseline archive is absent; --from-current exercises that path. Run npm run validate:people-materials, npm run validate:people and npm run validate:hero-section. The full production build includes the new validator and texture budget. tools/verify-character-maps.py verifies delivery channels and legacy image equivalence.

The ordinary PBR maps, bind-pose UVs, linear vertex colour and skin coverage alpha remain available for Unity/Unreal. manifest.json materialRefinement.engineBindings declares channel/colour-space, repeat, normal, reflectance, anisotropy and sheen settings; browserTiers records the balanced/cinematic split. Importers must reset the original fallback base tint to white when binding these maps, multiply linear vertex RGB, and use alpha clip for covered skin. Final route timings qualify balanced only. Other-engine bindings, cinematic-tier route performance and headset performance remain untested.

Capture before/control with --all --hardware --legacy-people-materials; after omits the legacy flag. Motion-before uses --motion --hardware --legacy-people-materials; motion-after omits the legacy flag. Capture collisions with --collision-audit --hardware. Run node tools/benchmark-character-materials.mjs with all builders idle, then node tools/report-character-materials.mjs. The original pre-change baseline images remain the before evidence; the runtime legacy switch permits repeated paired measurements without swapping files.

The existing anatomy provenance remains as recorded in content/source-assets/characters/README.md. New maps and masks are project-authored and use no external media. The next priority is profiling the character and shadow passes to locate the measured regression before adding more effects. The next asset-quality pass is garment fit/weighting and facial/eye/hair silhouette work on the same characters, preserving their roots and routes; materials alone cannot resolve those shape limitations.
