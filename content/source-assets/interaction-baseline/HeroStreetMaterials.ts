import { AbstractMesh, Color3, Material, PBRMaterial, Scene, Texture } from "@babylonjs/core";
import type { HeroBakeManifest } from "@egyptvr/shared-scene";
import daylight from "../../../../content/scene-data/hero-street.daylight.json";
import { createGroundSectionBinder } from "./HeroGroundMaterial";
import { streetTexture } from "./StreetTextureTrial";
export type { HeroBakeManifest } from "@egyptvr/shared-scene";

export const authoredHeroRoot = "/assets/authored/hero-street/";

/** Explicit channel semantics. Generated fallbacks never overwrite authored maps. */
function texture(scene: Scene, file: string, color: boolean, uvSet = 0): Texture {
  // glTF UV convention; no Y flip for textures attached to imported GLBs.
  const map = streetTexture(scene, authoredHeroRoot, file, color, uvSet);
  map.gammaSpace = color;
  map.coordinatesIndex = uvSet;
  map.anisotropicFilteringLevel = 4;
  map.wrapU = map.wrapV = uvSet ? Texture.CLAMP_ADDRESSMODE : Texture.WRAP_ADDRESSMODE;
  return map;
}

export function createHeroMaterialBinder(scene: Scene, manifest: HeroBakeManifest) {
  const finalLighting = (manifest as HeroBakeManifest & {finalLighting?:{irradianceRange:number}}).finalLighting;
  scene.metadata.finalLighting = finalLighting ?? null;
  const bindGroundSection = createGroundSectionBinder(scene);
  const cache = new Map<string, PBRMaterial>();
  const maps = new Map<string, Texture>();
  const getMap = (file: string, color: boolean, uvSet = 0) => {
    const key = `${file}:${uvSet}`;
    if (!maps.has(key)) maps.set(key, texture(scene, manifest.textureVariants?.[file] ?? file, color, uvSet));
    return maps.get(key)!;
  };
  return (mesh: AbstractMesh, assetId: string) => {
    const binding = manifest.assets.find(asset => asset.assetId === assetId);
    if (!binding) return;
    const bind = (source: Material | null): Material | null => {
      if (!(source instanceof PBRMaterial)) return source;
      const key = `${assetId}:${source.uniqueId}`;
      if (cache.has(key)) return cache.get(key)!;
      const mat = source.clone(`${source.name}-authored`)!;
      const surface = manifest.materials[source.name] ?? "original";
      const refined = manifest.id === "hero-street-authored-v2";
      if ((refined ? ["dust", "plaster", "linen", "pottery", "wood", "hero-plaster", "hero-linen"] : ["dust", "plaster"]).includes(surface)) {
        mat.albedoColor = Color3.White();
        mat.albedoTexture = getMap(`${surface}-albedo.png`, true);
        mat.bumpTexture = getMap(`${surface}-normal.png`, false);
        mat.bumpTexture.level = surface === "dust" ? .18 : surface === "plaster" ? .1 : surface === "hero-plaster" ? .24 : surface === "hero-linen" ? .14 : .2;
        mat.invertNormalMapX = !scene.useRightHandedSystem;
        mat.invertNormalMapY = scene.useRightHandedSystem;
        mat.metallicTexture = getMap(`${surface}-orm.png`, false);
        mat.useRoughnessFromMetallicTextureGreen = true;
        mat.useMetallnessFromMetallicTextureBlue = true;
        mat.useAmbientOcclusionFromMetallicTextureRed = false;
        mat.roughness = 1;
      }
      if (!refined) {
        if (surface === "wood") mat.albedoColor = Color3.FromHexString("#897050").toLinearSpace();
        if (surface === "pottery") mat.albedoColor = Color3.FromHexString("#b5815c").toLinearSpace();
        if (surface === "linen") mat.albedoColor = Color3.FromHexString("#d6c7a3").toLinearSpace();
      }
      mat.metallic = 0;
      // Cycles sky + sun bounce has no albedo or sun-direct contribution.
      // PBR ambient multiplies the RGB map by surface albedo in linear space.
      mat.ambientColor = Color3.White();
      mat.ambientTexture = getMap(binding.irradiance, false, binding.uvSet);
      // Preserve the baked visibility/contact pattern while balancing the sky
      // contribution against the real-time sun. No flat emissive shadow lift.
      mat.ambientTexture.level = daylight.indirectLightGain * (finalLighting?.irradianceRange ?? 1);
      mat.ambientTextureStrength = 1;
      mat.useAmbientInGrayScale = false;
      mat.ambientTextureImpactOnAnalyticalLights = 0;
      mat.directIntensity = 1;
      mat.environmentIntensity = 0;
      mat.emissiveColor = Color3.Black();
      mat.lightmapTexture = null;
      if (surface === "linen" || surface === "hero-linen") {
        mat.subSurface.isTranslucencyEnabled = true;
        mat.subSurface.translucencyIntensity = daylight.linenTranslucency;
        mat.subSurface.useAlbedoToTintTranslucency = true;
        mat.subSurface.minimumThickness = .001;
        mat.subSurface.maximumThickness = .003;
      }
      mat.backFaceCulling = source.backFaceCulling;
      if (surface === "dust") bindGroundSection(mat);
      mat.metadata = { surfaceId: surface, bakeId: manifest.id, irradianceUvSet: binding.uvSet };
      cache.set(key, mat);
      return mat;
    };
    if (mesh.material instanceof PBRMaterial) mesh.material = bind(mesh.material);
    else {
      const multi = mesh.material as { subMaterials?: (Material | null)[] } | null;
      if (multi?.subMaterials) multi.subMaterials = multi.subMaterials.map(bind);
    }
    mesh.receiveShadows = true;
    // Finish colours carry surface wear only, never transparency.
    mesh.hasVertexAlpha = false;
  };
}
