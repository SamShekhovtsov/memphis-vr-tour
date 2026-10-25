import { KhronosTextureContainer2, Scene, Texture } from "@babylonjs/core";
const decoderRoot="/assets/decoders/ktx2/";
let configured=false;
class RecoverableStreetTexture extends Texture {
  recover(url:string,onReady:()=>void) {
    this.updateURL(url,null,()=>{
      // Babylon retains the previous error flag after updateURL. Clear it
      // only once the original lossless texture has actually loaded.
      this._loadingError=false;this._errorObject=undefined;onReady();
    });
  }
}
/** Opt-in pilot only: keep lossless maps as the production default. */
export function streetTexture(scene:Scene,root:string,file:string,color:boolean,uvSet=0) {
  const request=new URLSearchParams(location.search).get("textureTrial");
  const caps=scene.getEngine().getCaps();
  const eligible=/^hero-plaster-(albedo|normal|orm)\.webp$/.test(file)&&!!(caps.bptc||caps.astc);
  const trial=!!request&&eligible;
  if(trial&&!configured){
    Object.assign(KhronosTextureContainer2.URLConfig,{
      jsDecoderModule:decoderRoot+"babylon.ktx2Decoder.js",
      wasmUASTCToASTC:decoderRoot+"uastc_astc.wasm",wasmUASTCToBC7:decoderRoot+"uastc_bc7.wasm",
      wasmUASTCToRGBA_UNORM:decoderRoot+"uastc_rgba8_unorm_v2.wasm",wasmUASTCToRGBA_SRGB:decoderRoot+"uastc_rgba8_srgb_v2.wasm",
      wasmUASTCToR8_UNORM:decoderRoot+"uastc_r8_unorm.wasm",wasmUASTCToRG8_UNORM:decoderRoot+"uastc_rg8_unorm.wasm",
      jsMSCTranscoder:decoderRoot+"msc_basis_transcoder.js",wasmMSCTranscoder:decoderRoot+"msc_basis_transcoder.wasm",
      wasmZSTDDecoder:decoderRoot+"zstddec.wasm"
    });configured=true;
  }
  const stats=scene.metadata.textureTrial??={requested:!!request,nativeCompression:!!(caps.bptc||caps.astc),maps:[] as Array<Record<string,unknown>>};
  const entry:Record<string,unknown>={source:file,trial,status:"loading"};
  if(trial)stats.maps.push(entry);
  const fallback=root+file;
  const url=trial?root+file.replace('.webp',request==='fail'?'.missing.ktx2':'.ktx2'):fallback;
  let failed=false;
  const map=new RecoverableStreetTexture(url,scene,false,false,Texture.TRILINEAR_SAMPLINGMODE,
    ()=>{entry.status='ready';entry.format=map.getInternalTexture()?.format;entry.width=map.getSize().width;},
    ()=>{if(trial&&!failed){failed=true;entry.status='fallback-loading';map.name=fallback;map.recover(fallback,()=>{entry.status='fallback-ready';});}}
  );
  map.gammaSpace=color;map.coordinatesIndex=uvSet;map.anisotropicFilteringLevel=4;
  map.wrapU=map.wrapV=uvSet?Texture.CLAMP_ADDRESSMODE:Texture.WRAP_ADDRESSMODE;
  return map;
}
