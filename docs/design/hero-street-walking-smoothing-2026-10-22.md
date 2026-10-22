# Walking and contact transition refinement

The existing ground-contact controller now eases feet into and out of stance.
No actor root, authored path, GLB, district geometry or camera is changed.

## Changes

- Replace the cubic travel/sine lift combination with quintic travel and a
  sixth-degree lift arc. Both velocity and acceleration approach zero at toe-off
  and touchdown, joining the stationary contact without the old vertical snap.
- Scale swing time from 0.12 to 0.24 seconds with root speed. Slower walking gets
  longer, lower steps; fast movement retains short swings to respect leg reach.
- Freeze duration, clearance and landing target at toe-off. Changing root speed
  cannot rescale the phase halfway through a step. Landing prediction uses the
  selected duration, and planted feet retain their world-space anchors.
- Freeze the browser audit after exactly 300 simulation steps. Before/after
  screenshots now show the same walking instant (time 2 + 299/60 seconds and
  authored clip frame 347), rather than only showing initialized contacts.
  The legacy `animationSeconds: 2` sidecar field is the audit start time.

## Checks

TypeScript, solver/transition tests, actor locks, street-bake locks and production
workspace builds passed. Vite retains its existing large-bundle warning.

`node tools/test-ground-contact-ik.mjs` checks contact endpoint velocity and
acceleration, clearance, reflected transforms, reach limits, missing ground and
unchanged roots. The 20-second controlled test produced 99 completed steps
instead of 114, with cumulative stance drift essentially unchanged at 0.025 m.
This controlled test is not a live-scene or hardware-performance benchmark.

The matched 300-step browser run retained all six contacts and recorded zero
root changes. Cumulative stance drift was 0.529 m over 1,242 comparisons, versus
6.732 m for uncorrected animated feet (92.1% reduction). The previous controller
recorded 0.516 m over 1,264 comparisons (92.4% reduction); stance sample sets
differ because swing timing changed. This pass smooths transitions, not a further
reduction in sliding. Maximum reach error increased slightly from 4.9 to 5.3 cm.

## Matched views

Both pairs use the locked 1280 by 720 camera settings and identical 300-step runs.

| View | Before | After |
| --- | --- | --- |
| Main street | [Before](screenshots/hero-street-main-smooth-before.png) | [After](screenshots/hero-street-main-smooth-after.png) |
| Entry | [Before](screenshots/street-entry-smooth-before.png) | [After](screenshots/street-entry-smooth-after.png) |

Screenshots show pose and composition; continuity tests address motion. This
refines the procedural gait rather than replacing it with motion capture. The
locked root's sharp direction changes, reach limits and the simple character
anatomy remain visible limitations. Unity/Unreal would need to reproduce these
contact curves in their own runtime controllers; the shared GLB is unchanged.

The next visual improvement would be ankle roll and sole orientation during
stance, followed by cloth deformation around the knees, without moving roots.
