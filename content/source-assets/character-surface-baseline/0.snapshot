import { AbstractMesh, Color3, PBRMaterial, Scene, Texture, Vector2 } from "@babylonjs/core";

/** Surface-only refinement. UVs/colours are attached to the original bind pose;
 * skeletons and movement continue through the existing actor implementation. */
export function createPeopleMaterialBinder(scene: Scene) {
  const legacy = new URLSearchParams(location.search).get("peopleMaterials") === "legacy";
  const cinematic = new URLSearchParams(location.search).get("quality") === "cinematic";
  const priorFit = new URLSearchParams(location.search).get("steps56") === "legacy";
  const materials = new Map<number, PBRMaterial>();
  const maps = new Map<string, Texture>();
  const map = (family: string, channel: string) => {
    const key = `${family}-${channel}`;
    if (!maps.has(key)) {
      const texture = new Texture(`/assets/authored/people/${key}.webp`, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
      texture.gammaSpace = channel === "albedo";
      texture.anisotropicFilteringLevel = 4;
      // Skin retains the licensed body's unwrap. Hair/linen have metre-scaled
      // bind-pose UVs. All detail therefore follows the deforming surface.
      if (family === "skin") texture.uScale = texture.vScale = 16;
      maps.set(key, texture);
    }
    return maps.get(key)!;
  };
  scene.metadata.heroPeopleMaterials = { id: legacy ? "legacy" : "hero-people-materials-v1", geometryChanged: false, textureCount: 0, bindings: [] };
  return (mesh: AbstractMesh) => {
    mesh.useVertexColors = !legacy;
    mesh.hasVertexAlpha = false;
    if (legacy || !(mesh.material instanceof PBRMaterial)) return;
    const source = mesh.material;
    const family = source.name.match(/hero-(skin|hair|linen)/)?.[1];
    if (!family) return;
    mesh.hasVertexAlpha = family === "skin" && priorFit;
    if (!materials.has(source.uniqueId)) {
      const material = source.clone(`${source.name}-surface`)!;
      material.albedoColor = Color3.White();
      material.albedoTexture = map(family, "albedo");
      material.bumpTexture = map(family, "normal");
      material.bumpTexture.level = family === "skin" ? .32 : family === "hair" ? .65 : .35;
      material.invertNormalMapX = !scene.useRightHandedSystem;
      material.invertNormalMapY = scene.useRightHandedSystem;
      material.metallicTexture = cinematic ? map(family, "orm") : null;
      material.useRoughnessFromMetallicTextureGreen = true;
      material.useMetallnessFromMetallicTextureBlue = true;
      material.useAmbientOcclusionFromMetallicTextureRed = false;
      material.metallic = 0;
      material.roughness = cinematic ? 1 : family === "skin" ? .64 : family === "hair" ? .53 : .94;
      material.metallicF0Factor = family === "skin" ? .75 : .9;
      material.emissiveColor = Color3.Black();
      if (family === "skin") {
        material.transparencyMode = priorFit ? PBRMaterial.PBRMATERIAL_ALPHATEST : PBRMaterial.PBRMATERIAL_OPAQUE;
        material.alphaCutOff = .5;
        // Alpha is a garment-coverage mask, not translucent skin. An alpha
        // channel on the albedo activates the standard PBR alpha-test path.
        material.albedoTexture.hasAlpha = true;
        // This RGB albedo has constant opaque alpha. The stock shadow shader
        // does not use vertex coverage; sampling it cannot change the shadow.
        // Keep the original opaque body shadow inside the covering garment.
        material.getAlphaTestTexture = () => null;
      }
      if (family === "hair") {
        material.anisotropy.isEnabled = cinematic;
        material.anisotropy.intensity = .25;
        material.anisotropy.direction = new Vector2(1, 0);
      }
      if (family === "linen") {
        material.sheen.isEnabled = cinematic;
        material.sheen.intensity = .18;
        material.sheen.roughness = .88;
        material.sheen.color = new Color3(.86, .81, .71);
      }
      material.metadata = { family, source: "project-authored PBR detail", geometryChanged: false };
      materials.set(source.uniqueId, material);
    }
    mesh.material = materials.get(source.uniqueId)!;
    scene.metadata.heroPeopleMaterials.textureCount = maps.size;
    scene.metadata.heroPeopleMaterials.bindings = [...materials.values()].map(material => ({
      family: material.metadata.family,
      alphaTest: material.transparencyMode === PBRMaterial.PBRMATERIAL_ALPHATEST,
      normalStrength: material.bumpTexture?.level,
      sheen: material.sheen.isEnabled ? material.sheen.intensity : 0,
      anisotropy: material.anisotropy.isEnabled ? material.anisotropy.intensity : 0,
      albedoSrgb: material.albedoTexture?.gammaSpace,
      normalLinear: !material.bumpTexture?.gammaSpace
    }));
  };
}
