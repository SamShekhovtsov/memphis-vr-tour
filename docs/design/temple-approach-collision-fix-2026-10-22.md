# Ptah floor and village approach collision repair

The district ground covers z=-75..75. The Ptah courtyard, raised processional
strip and shrine floor were visible but had collisions disabled. Visitors could
therefore descend through them beyond the district ground. The courtyard also
stopped short of the precinct rear wall, and the shrine floor stopped a metre
before its painted rear wall.

The existing temple floors now have collisions enabled. The courtyard retains
its entrance edge at z=47 and extends underneath the rear precinct wall to z=93.
The shrine floor overlaps the courtyard from z=74 and reaches its rear wall at
z=94. All three temple floors are also registered as WebXR floor meshes. A headset
was not available for device testing.

The two invisible residential collision rails previously continued to z=38.8,
blocking both sides of the open approach and the locked route's turn at z=34.
They now stop at z=18.5, just beyond the remaining house frontage near z=18.3.
Their entrance ends and lateral positions remain unchanged. Existing buildings,
actors, walking paths, cameras and visible temple walls retain their positions.

## Verification

The live Babylon collision coordinator is tested with the visitor camera's
ellipsoid (0.45, 0.8, 0.45), without moving the active camera. Before the fix,
16 of 24 checks failed: eight temple floor probes and eight left/right approach
crossings. After the fix, all 26 checks pass, including two added continuous
walking checks through the temple gate, across the floor joins, and across the
raised processional strip in both directions. House frontage and visible temple
wall collisions remain intact.

- [Before collision results](screenshots/hero-street-main-collision-before.json)
- [After collision results](screenshots/hero-street-main-collision-after.json)
- [Before locked view](screenshots/hero-street-main-collision-before.png)
- [After locked view](screenshots/hero-street-main-collision-after.png)

Run the dev server on port 5573, then `npm run qa:collisions`. This writes a locked
view and JSON report, and exits unsuccessfully if any collision check fails.
The captures use Chrome's GPU selection; frame timings are diagnostic and are
not a controlled performance comparison.

Browser production build and actor, people, hero-bake and content validators
passed. The hero-bake validator confirms the camera and route locks.
