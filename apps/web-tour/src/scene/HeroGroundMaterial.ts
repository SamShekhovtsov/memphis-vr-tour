import { MaterialPluginBase, PBRMaterial, Scene, Texture, UniformBuffer } from "@babylonjs/core";
import profile from "../../../../content/scene-data/hero-street.ground-section.json";

/** Bounded PBR replacement on the existing mesh; baked illumination is retained. */
class GroundSectionPlugin extends MaterialPluginBase {
  constructor(material: PBRMaterial, private readonly maps: Texture[]) {
    super(material, "HeroGroundSection", 190, {}, true, true, true);
  }
  getSamplers(samplers: string[]) {
    samplers.push("heroGroundAlbedo", "heroGroundNormal", "heroGroundORM");
  }
  getActiveTextures(textures: Texture[]) { textures.push(...this.maps); }
  isReadyForSubMesh() { return this.maps.every(map => map.isReady()); }
  bindForSubMesh(buffer: UniformBuffer) {
    ["heroGroundAlbedo", "heroGroundNormal", "heroGroundORM"].forEach((name, index) => buffer.setTexture(name, this.maps[index]));
  }
  getCustomCode(type: string) {
    if (type !== "fragment") return null;
    const b = profile.bounds;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        uniform sampler2D heroGroundAlbedo;
        uniform sampler2D heroGroundNormal;
        uniform sampler2D heroGroundORM;
        vec2 heroGroundUV() { return (vPositionW.xz - vec2(${b.minX}, ${b.minZ})) / vec2(${b.maxX-b.minX}, ${b.maxZ-b.minZ}); }
        float heroGroundWeight(vec2 uv) {
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
          return texture2D(heroGroundAlbedo, uv).a;
        }`,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        vec2 heroUV = heroGroundUV();
        float heroWeight = heroGroundWeight(heroUV);
        if (heroWeight > 0.001) {
          surfaceAlbedo = mix(surfaceAlbedo, toLinearSpace(texture2D(heroGroundAlbedo, heroUV).rgb), heroWeight);
          vec3 heroNormal = texture2D(heroGroundNormal, heroUV).rgb * 2.0 - 1.0;
          heroNormal.xy *= ${profile.normalStrength};
          normalW = normalize(mix(normalW, normalize(heroNormal.xzy), heroWeight));
        }`,
      CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: `
        vec2 heroRoughUV = heroGroundUV();
        float heroRoughWeight = heroGroundWeight(heroRoughUV);
        if (heroRoughWeight > 0.001) metallicRoughness.g = mix(metallicRoughness.g, texture2D(heroGroundORM, heroRoughUV).g, heroRoughWeight);`,
      CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: `
        if (heroWeight > 0.001) finalAmbient *= mix(1.0, texture2D(heroGroundORM, heroUV).r, heroWeight);`
    };
  }
}

export function createGroundSectionBinder(scene: Scene) {
  let maps: Texture[] | undefined;
  return (material: PBRMaterial) => {
    if (new URLSearchParams(location.search).get("ground") === "legacy") return;
    maps ??= Object.values(profile.maps).map(file => {
      const map = new Texture(profile.runtimeRoot + file, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
      // Custom shader explicitly decodes albedo; physical channels remain linear.
      map.gammaSpace = false;
      map.wrapU = map.wrapV = Texture.CLAMP_ADDRESSMODE;
      map.anisotropicFilteringLevel = 4;
      return map;
    });
    new GroundSectionPlugin(material, maps);
    scene.metadata.groundSection = { id: profile.id, bounds: profile.bounds, geometryChanged: false, maps: Object.values(profile.maps) };
  };
}
