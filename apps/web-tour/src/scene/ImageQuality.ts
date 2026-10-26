import { installCrispFxaa } from "./CrispFxaa";
import { BaseTexture, Camera, DefaultRenderingPipeline, Scene, Texture, RawTexture } from '@babylonjs/core';

export function legacyImageQuality() {
  return new URLSearchParams(location.search).get('imageQuality') === 'legacy';
}

/** Surface maps need oblique filtering; lightmap gutters and render targets do not. */
export function applyImageTextureQuality(scene: Scene, tier: string) {
  const legacy = legacyImageQuality() || new URLSearchParams(location.search).get('imageQuality')==='resolve';
  const surfaceLevel = legacy ? (tier === 'cinematic' ? 4 : tier === 'performance' ? 1 : 2)
    : tier === 'headset' || tier === 'performance' ? 2 : tier === 'cinematic' ? 8 : 4;
  const cap = scene.getEngine().getCaps().maxAnisotropy || 1;
  for (const map of scene.textures) {
    if (!(map instanceof Texture) || map instanceof RawTexture || map.isRenderTarget || map.isCube) continue;
    map.updateSamplingMode(legacy && tier === 'performance' ? Texture.BILINEAR_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE);
    const file=(map.url??map.name).toLowerCase();
    const physicalLevel=tier==='cinematic'?4:2;
    const authored=file.includes('/assets/authored/');
    const baseLevel=tier==='cinematic'?4:tier==='performance'?1:2;
    const level=legacy?surfaceLevel:!authored?baseLevel:map.coordinatesIndex===1?2:/normal/.test(file)?physicalLevel:/(?:^|[-_/])(orm|mrao)(?:[.-]|$)|roughness|metallic/.test(file)?physicalLevel:surfaceLevel;
    const groundColour=!legacy&&new URLSearchParams(location.search).get("clarity")!=="previous"&&tier!=="performance"&&tier!=="headset"&&file.includes("/hero-ground/ground-albedo.");
    map.anisotropicFilteringLevel=Math.min(cap,groundColour?8:level);
  }

}

export function createImageQualityControls(scene: Scene, camera: Camera, pipeline: DefaultRenderingPipeline, tier: string) {
  const originalClip = [camera.minZ, camera.maxZ];
  let activeTier = tier;
  let queued = false;
  const refresh = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; if (!scene.isDisposed) applyImageTextureQuality(scene, activeTier); });
  };
  scene.onNewTextureAddedObservable.add((texture: BaseTexture) => {
    // Babylon announces a texture inside BaseTexture's constructor, before onLoadObservable exists.
    queueMicrotask(() => {
      if (texture instanceof Texture) texture.onLoadObservable?.addOnce(refresh);
      refresh();
    });
  });
  return {
    apply(headset: boolean) {
      activeTier = headset ? 'headset' : tier;
      const legacy = legacyImageQuality(), desktop = !headset, previousClarity=new URLSearchParams(location.search).get("clarity")==="previous";
      const requested = desktop && tier === 'cinematic' ? 4 : 1;
      pipeline.samples = Math.min(requested, Math.max(1, scene.getEngine().getCaps().maxMSAASamples));
      pipeline.sharpenEnabled = false;
      if(desktop&&!legacy&&new URLSearchParams(location.search).get('imageQuality')!=='filters')installCrispFxaa(pipeline);
      pipeline.sharpen.colorAmount = 1;
      camera.minZ = desktop && !legacy ? .1 : originalClip[0];
      camera.maxZ = desktop && !legacy ? 512 : originalClip[1];
      applyImageTextureQuality(scene, activeTier);
      const stats = scene.metadata.rendering.imageQuality = {
        mode: legacy ? 'legacy' : 'restored', requestedSamples: requested, effectiveSamples: 1,
        sharpen: desktop&&!legacy ? (previousClarity?.20:.12) : 0, resolve:legacy?'native FXAA':'FXAA with luma-clamped detail in one pass', extraSharpenPass:false, groundColourAnisotropy:Math.min(scene.getEngine().getCaps().maxAnisotropy||1,!legacy&&!previousClarity&&desktop&&tier!=="performance"?8:tier==="cinematic"?8:tier==="performance"?1:4), subpixelSmoothing:legacy||previousClarity?1:0.5, flatRegionsBypassDetail:true, selectiveAuthoredFiltering:true, shaderActive:false, surfaceAnisotropy: Math.min(scene.getEngine().getCaps().maxAnisotropy || 1, legacy?(activeTier==='cinematic'?4:activeTier==='performance'?1:2):activeTier==='cinematic'?8:activeTier==='balanced'?4:2),
        normalAnisotropy:legacy?(activeTier==='cinematic'?4:activeTier==='performance'?1:2):activeTier==='cinematic'?4:2, atlasAnisotropy:legacy&&activeTier==='cinematic'?4:legacy&&activeTier==='performance'?1:2, mipFiltering: 'trilinear', clipPlanes: [camera.minZ, camera.maxZ], supersampling: false
      };
      scene.metadata.rendering.antialiasing = headset ? 'XR framebuffer' : `${pipeline.samples>1?'MSAA'+pipeline.samples+' + ':''}${legacy?'FXAA':'crisp FXAA'}`;
      scene.onAfterRenderObservable.addOnce(() => { stats.effectiveSamples = pipeline.imageProcessing?.inputTexture?.samples ?? 1;stats.shaderActive=!!pipeline.fxaa?.getEffect()?.fragmentSourceCode.includes('memphisClampedDetail'); });
    }
  };
}
