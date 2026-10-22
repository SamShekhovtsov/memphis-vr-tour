# Ankle roll and sole alignment

Existing hero feet and their attached sandals now align to the picked street
surface. No GLB, actor root, walking path, district placement or camera is changed.

## Behaviour

- Cache surface normals with existing contact/landing ground samples.
- Align the sole to the surface in mid-stance, replacing the authored ankle tilt
  during contact. Preserve the existing two-bone leg solve and root trajectory.
- Apply a restrained heel lift (up to about 7 degrees) before toe-off. During
  swing, ease through neutral to a roughly 4.6-degree heel-first landing, then
  settle toward flat over 80 ms. Stationary workers keep flat supported soles.
- Offset the foot centre around the heel/toe support edge so rotating the sandal
  does not simply drive that edge through the ground. These offsets affect the
  ankle/leg pose only, never the character root.
- Blend ground normals over the swing; keep the selected stance normal fixed to
  avoid frame-by-frame surface-picking jitter.

## Validation

TypeScript, ankle and ground-contact tests, actor/street lock validators and the
production workspace build passed. The existing Vite large-bundle warning remains.

`node tools/test-ankle-contact.mjs` checks flat and sloped alignment, reversed
headings, fixed support-edge compensation and smooth swing-roll endpoints.
`node tools/test-ground-contact-ik.mjs` also checks actual solved sole normals,
reflected parents, non-uniform foot scales and unchanged roots.

The 300-step browser run recorded six contacts and zero root changes. In the
captured pose, all six sole normals match their sampled surface plus intended
roll to within 4e-9 in dot product. Maximum target reach error over the run was
4.9 cm, reflecting the remaining fixed-root constraint. These are geometry and
motion checks, not a hardware-performance benchmark.

The existing drift diagnostic measures foot-centre movement. It now includes
intentional heel/toe rocking and must not be interpreted as pure ground sliding.
The pivot test separately verifies that the intended support edge stays fixed
under the rotation/translation calculation. Locked-root reach errors can still
prevent the solved leg from reaching its intended target exactly.

## Matched screenshots

Both views use the locked camera/1280 by 720 viewport, 300 simulation steps and
authored clip frame 347, matching the baseline walking instant.

| View | Before | After |
| --- | --- | --- |
| Main street | [Before](screenshots/hero-street-main-ankle-before.png) | [After](screenshots/hero-street-main-ankle-after.png) |
| Entry | [Before](screenshots/street-entry-ankle-before.png) | [After](screenshots/street-entry-ankle-after.png) |

This is a restrained procedural contact pass for the approved near-flat street,
not a full articulated toe rig or general uneven-terrain locomotion system.
The rigid sandal and simple foot shape remain limitations. Shared GLBs remain
portable; Unity/Unreal need equivalent runtime contact and ankle logic.

Next: improve cloth deformation around the knees and ankle anatomy, keeping the
same root/path locks. A future articulated toe rig would allow the sole to bend
during push-off rather than rolling as one rigid piece.
