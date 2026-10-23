import { DefaultRenderingPipeline, ImageProcessingConfiguration, Scene, Camera, ShadowGenerator } from "@babylonjs/core";
import daylight from "../../../../content/scene-data/hero-street.daylight.json";

export function configureRendering(scene: Scene, camera: Camera, tier: string) {
  const pipeline = new DefaultRenderingPipeline("desktop-quality", true, scene, [camera]);
  function apply(headset: boolean) {
    pipeline.fxaaEnabled = !headset;
    pipeline.samples = !headset && tier === "cinematic" ? 4 : 1;
    pipeline.bloomEnabled = false;
    pipeline.depthOfFieldEnabled = false;
    pipeline.imageProcessingEnabled = !headset;
    const image = scene.imageProcessingConfiguration;
    image.applyByPostProcess = !headset;
    image.toneMappingEnabled = true;
    image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    image.exposure = daylight.exposure;
    image.contrast = daylight.contrast;
    image.vignetteEnabled = !headset && tier === "cinematic";
    image.vignetteWeight = .15;
    scene.fogDensity = daylight.fogDensity;
    const shadowMapSize = headset || tier === "performance" ? 1024 : 2048;
    const shadows = scene.getLightByName("lowGoldSun")?.getShadowGenerator();
    const softShadows = !headset && tier === "cinematic";
    if (shadows instanceof ShadowGenerator) {
      if (shadows.mapSize !== shadowMapSize) shadows.mapSize = shadowMapSize;
      shadows.usePercentageCloserFiltering = !softShadows;
      shadows.useContactHardeningShadow = softShadows;
      shadows.contactHardeningLightSizeUVRatio = .015;
    }
    scene.metadata.rendering = {
      tier: headset ? "headset" : tier,
      antialiasing: headset ? "XR framebuffer" : pipeline.samples > 1 ? "MSAA4 + FXAA" : "FXAA",
      toneMapping: "ACES", exposure: image.exposure, contrast: image.contrast,
      shadowMapSize, shadowFilter: softShadows ? "PCSS" : "PCF",
      daylightProfile: daylight.id, indirectLightGain: daylight.indirectLightGain
    };
  }
  apply(tier === "headset");
  return { setHeadset: apply };
}
