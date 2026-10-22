import { DefaultRenderingPipeline, ImageProcessingConfiguration, Scene, Camera, ShadowGenerator } from "@babylonjs/core";

export function configureRendering(scene: Scene, camera: Camera, tier: string) {
  const pipeline=new DefaultRenderingPipeline('desktop-quality',true,scene,[camera]);
  function apply(headset: boolean) {
    pipeline.fxaaEnabled=!headset;
    pipeline.samples=!headset && tier==='cinematic' ? 4 : 1;
    pipeline.bloomEnabled=false;
    pipeline.depthOfFieldEnabled=false;
    pipeline.imageProcessingEnabled=!headset;
    const image=scene.imageProcessingConfiguration;
    image.applyByPostProcess=!headset;
    image.toneMappingEnabled=true;
    image.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;
    image.exposure=1.08;image.contrast=1.08;
    image.vignetteEnabled=!headset && tier==='cinematic';
    image.vignetteWeight=.15;
    scene.fogDensity=.00065;
    const shadowMapSize=headset || tier==='performance' ? 1024 : 2048;
    const shadows=scene.getLightByName('lowGoldSun')?.getShadowGenerator();
    if(shadows instanceof ShadowGenerator && shadows.mapSize!==shadowMapSize)shadows.mapSize=shadowMapSize;
    scene.metadata.rendering={tier:headset?'headset':tier,antialiasing:headset?'XR framebuffer':pipeline.samples>1?'MSAA4 + FXAA':'FXAA',toneMapping:'ACES',exposure:1.08,shadowMapSize};
  }
  apply(tier==='headset');
  return { setHeadset:apply };
}
