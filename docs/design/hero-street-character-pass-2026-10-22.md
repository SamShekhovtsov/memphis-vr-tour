# Existing street character refinement

Refined the three existing animated street actors in place. No actors were
added, and no street geometry, lighting, root placement, route, camera or
animation channel was changed.

## Implementation

- Replaced cylinder torsos with elliptical profiles for waist, chest, shoulders
  and neck transition. Tapered forearms and calves retain the original pivots.
- Replaced cuboid hair with rounded caps, shaped heads and jaws, added small
  ears/eyes/mouth details, and rounded the feet. Hands and necks use smooth normals.
- Replaced rigid cone garments with shaped, lightly folded profiles. Clothing
  remains plain and restrained within the existing Old Kingdom art direction.
- Dedicated skin and flax PBR materials avoid the old scenery-atlas colour
  multiplication. Geometry/materials remain standard animated glTF, with no new
  runtime shader or texture dependency. Unity/Unreal import has not been tested.

These are project-authored artistic reconstructions, not portraits or claims of
historically verified facial appearance. The existing movement is intentionally
preserved; this pass does not add skeletal elbow/knee deformation or cloth physics.

## Locks and verification

`content/scene-data/hero-actors.motion-lock.json` records the original three root
transforms, exported animation data hashes, and camera/route hashes. Run
`npm run validate:actors` to compare the asset against that baseline. The check
also detects detached torsos/limbs, a regression caught and corrected during
visual review. The check is included in the root build pipeline.

Regenerate just these actors in PowerShell:

```powershell
$env:EGYPTVR_ASSET_IDS='animated-street-actors'
npm run generate:glb
Remove-Item Env:EGYPTVR_ASSET_IDS
npm run validate:actors
```

The actor GLB is approximately 0.78 MB, within its unchanged 0.85 MB budget.
Content/history, browser budgets and authored-street lock validation passed.
Browser/shared production builds passed (existing Vite large-bundle warning).
Both screenshot pairs match camera, viewport and animation metadata and report
no texture errors. `git diff --check` passed.

## Matched screenshots

Both views use the existing locked cameras, 1280 × 720 viewport, balanced
quality, and frozen animation time. JSON sidecars record capture settings and
texture-load status. Rendering uses SwiftShader; it is not a hardware benchmark.

| View | Before | After |
| --- | --- | --- |
| Main | [Before](screenshots/hero-street-main-characters-before.png) | [After](screenshots/hero-street-main-characters-after.png) |
| Entry | [Before](screenshots/street-entry-characters-before.png) | [After](screenshots/street-entry-characters-after.png) |

## Remaining quality work

The silhouettes are softer, but the actors remain stylized. The next meaningful
step is a continuous skinned body with elbow/knee articulation and better shoulder
deformation, retaining the same root trajectories. Then add UV-authored skin and
garment detail, restrained facial variation, and distance LODs. Validate close-up
quality separately without replacing these locked street comparison cameras.
