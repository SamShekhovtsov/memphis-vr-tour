# Hero street: silhouettes, people and rendering

## Implemented

The existing street has 3 mm cloth thickness, raised hems, sag held at the panel
edges, slightly irregular wooden supports, softened vessel lips and the previous
rounded plaster corners. The bake is regenerated from the locked source chunks.
No district, route or camera data is changed.

All three hero people now use CC0 MakeHuman-derived anatomical rigs from
Innerscene, with 163 joints and retained skin weights. Two shared assets serve
the three characters: a female carrier and male worker/walker. Project-authored
wrapped linen and a shoulder-covering bodice replace modern clothing. Clothing
and cropped hair follow the same skeleton. Sources, license links and SHA-256
hashes are retained in `content/source-assets/characters/` and the runtime manifest.

The new bodies live under the original motion roots. Distance-driven arm motion
blends toward idle; the carrying arms reach toward the existing jar, with a head
pad retained. The worker leans toward its retained original work block, with the
original tool attached to the anatomical wrist and aimed at the work surface. Existing
two-bone ground-contact IK, sole alignment and ankle roll are adapted to the
anatomical leg proportions. This is procedural animation, not motion capture.
The body pose reserves 3.5 cm of knee flexion beneath the unchanged path root.
In the 300-step motion audit this reduced maximum reach error from 8.0 to 4.5 cm;
all six contacts remained present and the controller recorded zero root changes.
Foot-centre drift includes the intentional heel/toe roll, so it is not a pure
sliding measurement.

Desktop tiers now use ACES tone mapping, restrained contrast and haze, FXAA and
optional 4x MSAA for `?quality=cinematic`. Bloom and depth of field are disabled.
`?quality=headset` and entering WebXR use a separate path with no desktop
vignette/postprocess AA and a smaller shadow map for the headset profile.

Each street chunk has two actual reduced meshes, generated offline with its
lightmap islands split before simplification. The runtime loads these on demand,
uses distance hysteresis and retains available geometry after a loading failure.
The original query mesh remains available for foot grounding when its visual LOD
is hidden. Street LODs no longer use a null geometry replacement.

## Delivery and performance scope

Lossless WebP variants reduce street texture delivery from 17.35 MB to 10.69 MB
(38.4%). The conversion verifies decoded RGB values exactly, including normal
and irradiance maps. PNG sources remain available. This is delivery compression;
GPU texture memory is unchanged. KTX2/Basis GPU compression is a separate future
optimization requiring format/decoder testing on the target browsers/headsets.

Shared character downloads total 3.69 MB: 30,514 triangles for the male and
33,291 for the female. The old actor file is still loaded for its locked roots,
original animation channels and carried load, although its body meshes are hidden.

Solid cloth backs and refined silhouettes increase the high-detail street files
from 8.83 MB to 13.16 MB. That cost has an explicit 14 MB validation budget.
Reduced geometry is streamed in addition to the initial high-detail chunks;
this implementation reduces distant draw geometry, not the initial high-detail
download. Complete district streaming and GPU texture compression remain future
delivery work; these limits are not concealed by the LOD measurements.

## Matched views

All pairs use the existing camera bookmarks, 1280 by 720 viewport, balanced tier
and the same frozen time of 2 seconds. The locked root transforms and old clip
phase are preserved; replacement anatomy and procedural poses differ deliberately.

| View | Before | After |
| --- | --- | --- |
| Main street | [Before](screenshots/hero-street-main-stages567-before.png) | [After](screenshots/hero-street-main-stages567-after.png) |
| Entry | [Before](screenshots/street-entry-stages567-before.png) | [After](screenshots/street-entry-stages567-after.png) |
| Material / oblique view | — | [After](screenshots/hero-street-material-stages567-after.png) |

## Measured desktop performance

Chrome selected the actual Intel HD Graphics 4600 through ANGLE/Direct3D 11.
Each tier completed one accelerated guided-route sweep with 169 measured
wall-clock frame intervals, including LOD loading. These are headless desktop
results on this machine, not a physical-headset or sustained thermal test.

| Tier | Render size | Median frame | 95th percentile | Median-equivalent FPS |
| --- | --- | --- | --- | --- |
| Performance | 948 × 533 | 25.3 ms | 80.8 ms | 39.5 |
| Balanced | 1280 × 720 | 24.7 ms | 63.0 ms | 40.5 |
| Cinematic | 1280 × 720 | 37.1 ms | 107.7 ms | 27.0 |

The available GPU does **not** sustain 60 FPS with this scene; the route has
visible frame-time spikes. The cinematic tier is an opt-in quality setting, not
a claim of smooth performance on this older integrated GPU. Physical headset
performance still needs testing on the intended device. Its separate rendering
configuration was verified to boot with all characters and a 1024px shadow map.

Street geometry totals 193,610 / 106,483 / 54,209 triangles at LOD 0 / 1 / 2,
reducing actual distant geometry by 45% / 72%. All three chunks switched to
reduced levels during the route without failed loads. The locked main view keeps
nearby detail at full quality. Main-view draw calls fell from 431 to 359, while
active indices increased from 1.05M to 1.78M because the characters and cloth now
contain more geometry. The baseline screenshots used SwiftShader, so no
before/after hardware-FPS comparison is asserted.

[Raw benchmark and comparison results](hero-street-performance-2026-10-22.json).
Regenerate the report with `node tools/report-hero-performance.mjs` after captures.

## Reproduce

TypeScript, production workspace build, source provenance/skin weights, street
UV/material/LOD statistics, actor/camera/route locks, content/history checks and
both IK/ankle test suites passed. Vite retains its existing large-bundle warning.

- `npm run bake:hero`
- `npm run build:people`
- Run `tools/compress-hero-textures.py` with Python/Pillow after baking.
- `npm run typecheck`, `npm run validate:hero`, `npm run validate:people`,
  `npm run validate:actors`, existing content/history/optimization validators.
- `node tools/test-ground-contact-ik.mjs` and `node tools/test-ankle-contact.mjs`.
- `node tools/capture-hero-shot.mjs stages567-after --all`
- `node tools/capture-hero-shot.mjs route-benchmark --benchmark --hardware --quality=balanced`

The benchmark sweeps the existing guided route through 180 rendered frames,
records wall-clock frame intervals after ten warm-up frames and reports GPU
identity, draw calls, texture estimates and loaded LODs. This is an accelerated
route sweep, not a headset comfort test or a sustained thermal benchmark. Normal
camera bookmarks and visitor movement are unchanged outside `?benchmark=1`.

## Remaining visual limits

Anatomy is substantially improved, but the characters still need richer skin and
eye materials, more detailed hair, cloth deformation review and polished hand/tool
interaction. Simple rigid toe roll and fixed path turns remain visible limits.
The work is a concrete advance toward the cinematic references, not a claim that
their final quality or headset performance target has been reached.
