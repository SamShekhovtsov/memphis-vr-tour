# Ground-contact IK for existing actors

The browser now solves each existing leg after the unchanged root-path update.
The GLB, root trajectories, actor placement, district and camera files are not
modified. Arms continue using their existing animation.

`GroundContactIK.ts` maintains world-space stance anchors. A two-bone analytic
solve bends the hip/knee chain toward each anchor; the authored ankle orientation
is retained. Short swing steps use smooth interpolation and toe clearance, with
placement driven by root motion rather than animation-list order. Missing ground
retains the animated pose; unreachable targets clamp to the leg's actual reach.
Path turns and large time discontinuities release old contacts to avoid twisting
the feet across the locked root turn.

Ground is sampled from the existing street geometry at initialization and planned
steps, not with six full triangle picks every frame. Initial contacts are limited
to reachable targets. The solver restores its pose overrides before the next
animation evaluation, avoiding cumulative drift and supporting paused QA poses.

## Verification

- `node tools/test-ground-contact-ik.mjs` (Node 24, or Node with TypeScript
  stripping) exercises reflected glTF transforms, reach limits, missing support,
  unchanged roots and a 20-second carrier-shaped motion simulation.
- Controlled simulation: 1,364 stance comparisons and 114 steps; cumulative
  stance drift was 0.025 m versus 8.447 m without correction (99.7% reduction).
  These are summed distances across feet/time, not a live-scene benchmark.
- `node tools/capture-hero-shot.mjs ik-audit --ik-audit` advances real browser
  actors and clips at 60 simulation steps/second, five steps per render. Its JSON sidecar records corrected stance
  drift, the uncorrected animated-foot drift over the same samples, reach error,
  and any root changes. This diagnostic is separate from the frozen matched views.
- Captured browser audit: 430 steps, 1,784 stance comparisons; cumulative drift
  was 0.625 m versus 9.497 m in the uncorrected poses (93.4% reduction), with zero
  root changes. All six feet had contacts. Maximum target reach error was 4.9 cm;
  locked roots can still pull a planted foot beyond its leg reach. These figures
  describe this sampled sequence, not every path phase or a hardware benchmark.
- Original actor animation, root, street-bake, route and camera lock checks remain
  applicable. The browser IK override does not rewrite the source motion lock.
- TypeScript checks, solver tests, actor/street lock validators and production
  workspace builds passed. Vite still reports its existing large-bundle warning.
  Both matched pairs have identical camera, viewport and frozen animation time;
  each final view records six contacts with target residuals below 0.001 mm.

## Matched screenshots

| View | Before | After |
| --- | --- | --- |
| Main | [Before](screenshots/hero-street-main-ik-before.png) | [After](screenshots/hero-street-main-ik-after.png) |
| Entry | [Before](screenshots/street-entry-ik-before.png) | [After](screenshots/street-entry-ik-after.png) |

Both pairs use the original cameras, 1280 × 720 viewport, balanced quality and
the same QA animation phase. Sidecars contain contact targets and residual errors.
Use `?ik=0` to disable the correction for debugging. Static screenshots demonstrate
contact placement; the motion tests measure sliding.

## Limits

This is a browser contact controller for the approved near-flat street, not a
general terrain locomotion system. It does not move the pelvis/root or stretch
legs, so extreme reach and sharp locked turns can still cause small contact
errors. Full sole alignment on uneven terrain, pelvis compensation and cloth
skinning are future work. Unity/Unreal can reuse the GLB rig but need an equivalent
runtime IK controller; this TypeScript controller is not embedded in the GLB.
