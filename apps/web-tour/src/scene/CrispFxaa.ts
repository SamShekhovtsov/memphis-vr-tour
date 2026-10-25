import { DefaultRenderingPipeline, ShaderStore } from '@babylonjs/core';
import { fxaaPixelShader } from '@babylonjs/core/Shaders/fxaa.fragment';

/** Babylon's FXAA, with a bounded detail resolve reusing its four cardinal samples.
 * The vendor shader is untouched. High-contrast edges receive AA, never sharpening.
 */
export function installCrispFxaa(pipeline: DefaultRenderingPipeline) {
  let source = fxaaPixelShader.shader;
  const once = (from: string, to: string) => {
    if (source.split(from).length !== 2) throw new Error('Pinned FXAA shader changed; review image resolve');
    source = source.replace(from, to);
  };
  once('float rangeMaxScaled=rangeMax*fxaaQualityEdgeThreshold;', `
#ifndef MALI
if(rangeMax-rangeMin<0.008){gl_FragColor=vec4(rgbyM.rgb,rgbyM.a);return;}
#endif
float memphisGradientX=abs(lumaE-lumaW),memphisGradientY=abs(lumaN-lumaS);
bool memphisCoherentEdge=max(memphisGradientX,memphisGradientY)>8.0*min(memphisGradientX,memphisGradientY);
float rangeMaxScaled=rangeMax*(memphisCoherentEdge?0.125:0.20);`);
  source = source.replaceAll('gl_FragColor=rgbyM;', `
float memphisLuma=clamp(lumaM+0.20*(lumaM-(lumaN+lumaS+lumaE+lumaW)*0.25),rangeMin,rangeMax);
vec3 memphisClampedDetail=clamp(rgbyM.rgb*(memphisLuma/max(lumaM,0.0001)),0.0,1.0);
gl_FragColor=vec4(memphisClampedDetail,rgbyM.a);`);
  ShaderStore.ShadersStore.memphisCrispFxaaPixelShader = source;
  const defines = pipeline.fxaa.getEngine()?.extractDriverInfo().toLowerCase().includes('mali') ? '#define MALI 1\n' : null;
  pipeline.fxaa.updateEffect(defines, null, null, undefined, undefined, () => { console.warn('Image resolve unavailable; using native FXAA');pipeline.fxaa.updateEffect(defines); }, 'fxaa', 'memphisCrispFxaa');
}
