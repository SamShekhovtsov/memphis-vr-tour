# Hero street: façade, cloth and prop refinement

This pass refines existing surfaces in the authored hero-street chunks. The
generated source GLBs, district, route, camera presets, sun, and exposure remain
unchanged. This is an incremental realism pass, not a claim of cinematic parity.

## Changes

- Rounded eligible plaster hard edges with a maximum 18 mm bevel. Open skins,
  ground and thin trim are excluded. Reduced high-frequency plaster texture noise.
- Subdivided existing linen panels and added small folds (up to 40 mm) and
  85 mm of sag on horizontal panels, with zero displacement at panel corners.
  Existing canopy frames remain in place.
- Refined upright round pottery with smooth shading and an 18 mm maximum belly
  adjustment; base and rim elevations remain fixed. Flat clay fragments are excluded.
- Added authored linen weave, wood grain and fired-clay variation as shared
  albedo, tangent-space normal and packed ORM textures, at a 0.5 m repeat scale.
- Rebuilt UV1 irradiance after the mesh changes. Direct sun is still real-time;
  the linear bake contains sky illumination and indirect sunlight only.

The refinement lives in `tools/blender/refine_hero_surfaces.py`, invoked by
`npm run bake:hero`. Version 2 of the authored manifest records physical texture
scales and displacement limits. Mesh geometry and texture channels remain glTF
compatible for future Unity/Unreal material setup; engine imports are not tested.

## Matched captures

Both comparisons use the camera-lock JSON, 1280 × 720 viewport, balanced quality,
and frozen animation time of two seconds. JSON sidecars record readiness, bake
version, texture errors and camera position. Chrome SwiftShader is used for
repeatable rendering, not hardware performance measurements.

| View | Before | After |
| --- | --- | --- |
| Main | [Before](screenshots/hero-street-main-forms-before.png) | [After](screenshots/hero-street-main-forms-after.png) |
| Entry | [Before](screenshots/street-entry-forms-before.png) | [After](screenshots/street-entry-forms-after.png) |

The baseline capture completed these two views; the third diagnostic view timed
out, so it is not included in this comparison.

## Remaining limitations

The existing characters, simple vessel profiles and repeated building forms
still constrain realism. These small refinements cannot replace detailed hero
asset modelling. Headset and target-device GPU performance remain unmeasured.

## Verification and delivery cost

- Browser/shared production builds and TypeScript checks passed. Vite retains
  its existing large-bundle warning.
- Content, historical, browser fallback budgets and authored-bake validation
  passed, including camera/route hashes, unchanged source hashes and exact
  chunk transforms. `git diff --check` passed.
- Both final screenshot sidecars match their baseline camera positions,
  viewports and animation times; all three hero chunks loaded with no texture
  errors. Visually, pottery is rounder and cloth edges sag; façade improvements
  are subtle. This pass does not yet match the cinematic references.
- Authored GLBs increased from 5.42 MB to 8.83 MB. Version 2 has an explicit
  10 MB geometry limit for the extra surface tessellation (version 1 keeps 7 MB).
  Runtime textures total 14.91 MB, below the unchanged 20 MB limit.
- The Blender runner now returns a failing exit code on Python errors, and PNG
  saves retry brief Windows file-watcher conflicts.
