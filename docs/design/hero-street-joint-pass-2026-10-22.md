# Elbow and knee articulation

The three existing actors now have two-bone, continuously skinned limbs. Blended
weights across the joint region replace rigid whole-limb rotation. Six elbows
and six knees are animated; no actors or street objects were added.

Root transforms, root animation curves, existing shoulder/hip curves, camera and
route definitions remain locked against the original motion-lock file. New
tracks share the original effective 1× playback rate. Babylon's `start(true)`
previously reset the preceding index-based rate assignment to 1; this is now
explicit as `start(true, 1)`. The browser's root-path routines are unchanged.

## Behaviour

- Walking knees flex during swing and remain slightly bent during stance.
- Walking elbows retain a relaxed bend; carrier elbows stay flexed, while the
  worker's working elbow cycles through a larger motion and knees stay braced.
- Hands and the existing tool follow the forearm bones. Feet and sandals follow
  the shins, with ankle counter-rotation to avoid pitching with the entire leg.
- Leg length now ends at the existing ankle height rather than extending below
  the floor. Actor root positions and foot rest placements are unchanged.
- Joint tracks use denser samples, normalized skin weights and matching loop
  endpoints. The GLB contains ordinary glTF skins and animation, with no custom
  deformation shader. Unity/Unreal import is not yet tested.

## Verification and cost

`npm run validate:actors` checks the original motion locks plus 12 animated joints,
12 skinned meshes, skin-weight normalization, finite rotations, loop closure and
non-static walking joints. Existing content, historical, street-bake and browser
budget checks pass. Browser QA records live joint rotations and clip timing.
Final browser/shared production builds and TypeScript checks passed, with the
existing Vite bundle-size warning. Both captures match camera, viewport and
animation phase, show 12 live joints at the preserved 1× rate, and report no
texture errors. `git diff --check` passed.

The actor asset grew from approximately 0.78 MB to 0.96 MB. Its individual budget
is explicitly increased from 0.85 MB to 1 MB; the total browser budget is unchanged.

## Matched comparison

The original locked main and entry cameras, 1280 × 720 viewport, balanced quality
and identical QA animation phase are used. JSON sidecars include loading status.
The legacy QA field `animationSeconds: 2` describes the scene-time freeze; GLB
groups use the existing frame-48 freeze, preserved for before/after matching.

| View | Before | After |
| --- | --- | --- |
| Main | [Before](screenshots/hero-street-main-joints-before.png) | [After](screenshots/hero-street-main-joints-after.png) |
| Entry | [Before](screenshots/street-entry-joints-before.png) | [After](screenshots/street-entry-joints-after.png) |

## Limits and next step

These are procedural joint cycles, not motion capture or a complete biomechanical
gait. There is no ground-contact IK, and the preserved root motion can still cause
foot sliding. Clothing remains rigid, so knee movement is partly obscured in the
locked wide views. Next: ground-contact IK and garment skinning, retaining root
paths and the same comparison cameras. Hardware VR performance remains untested.
