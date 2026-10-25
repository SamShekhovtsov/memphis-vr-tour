"""Inspect unclipped linear bakes, retain HDR range, add bounded contacts.
No geometry, UVs, source maps or runtime assets are modified by composition.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,json,math,hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/generated/steps78-build'
BASE=ROOT/'apps/web-tour/public/assets/authored/hero-street'
profile=json.loads((ROOT/'content/scene-data/hero-street.finish-lighting.json').read_text())
manifest=json.loads((OUT/'manifest.json').read_text())
filtered={};audit={}
def median3(a):
 p=np.pad(a,((1,1),(1,1),(0,0)),mode='edge');out=np.empty_like(a)
 for y in range(0,a.shape[0],64):
  stop=min(y+64,a.shape[0]);stack=np.stack([p[y+dy:stop+dy,dx:dx+a.shape[1]] for dy in range(3) for dx in range(3)])
  out[y:stop]=np.median(stack,axis=0)
 return out
for part in ('near','mid','far'):
 raw=np.load(OUT/(part+'-linear.npz'));a=(raw['sky']+raw['bounce'])[::-1].copy() # Blender pixels are bottom-up; PNG rows are top-down
 clean=median3(a)
 # A sub-texel separable kernel follows median rejection; no display blur.
 p=np.pad(clean,((0,0),(1,1),(0,0)),mode='edge');clean=.12*p[:,:-2]+.76*p[:,1:-1]+.12*p[:,2:]
 p=np.pad(clean,((1,1),(0,0),(0,0)),mode='edge');clean=.12*p[:-2]+.76*p[1:-1]+.12*p[2:]
 ao=Image.fromarray(np.uint8(np.clip(raw['ao'][::-1]*255,0,255))).filter(ImageFilter.GaussianBlur(.55)).resize((2048,2048),Image.Resampling.BILINEAR)
 gain=1-profile['bake']['contactAttenuation']*(1-np.asarray(ao,dtype=float)/255)
 noise_residual=np.abs(a-clean)
 clean*=gain[:,:,None];filtered[part]=clean
 old=np.asarray(Image.open(ROOT/'content/source-assets/lighting/steps78-base'/(part+'-irradiance.png')).convert('RGB'),dtype=float)/255
 valid=np.max(a,axis=2)>.002
 audit[part]={'unclippedLinearMaximum':float(a.max()),'rawChannelsOverOne':int(np.count_nonzero(a>1)), 'oldSaturatedChannels':int(np.count_nonzero(old>=254/255)), 'noiseResidualMedian':float(np.median(noise_residual[valid])), 'noiseResidualP95':float(np.percentile(noise_residual[valid],95)), 'contactMinimumGain':float(gain.min()),'contactMeanGain':float(gain.mean())}
scale=max(1,math.ceil(max(float(a.max()) for a in filtered.values())*16)/16)
for part,a in filtered.items():
 image=Image.fromarray(np.uint8(np.clip(np.rint(a/scale*255),0,255)),'RGB')
 image.save(OUT/(part+'-irradiance.png'));image.save(OUT/(part+'-irradiance.webp'),lossless=True,method=6)
 assert Image.open(OUT/(part+'-irradiance.webp')).convert('RGB').tobytes()==image.tobytes()
 audit[part]['newClippedChannels']=int(np.count_nonzero(a>scale));audit[part]['rangeScale']=scale
manifest['finalLighting']={'profile':profile['id'],'irradianceRange':scale,'samples':profile['bake']['samples'],'resolution':2048,'directSunBaked':False,'albedoBaked':False,'movingActorsBaked':False,'noiseFilter':'3x3 median and 0.12/0.76/0.12 subtexel kernel on linear irradiance only','audit':audit}
manifest['contactPolish']={'distanceMeters':.4,'resolution':1024,'maxIndirectAttenuation':profile['bake']['contactAttenuation'],'affects':'existing linear sky/bounce only','geometryAndUvsChanged':False,'movingActorsBaked':False}
manifest['irradianceRefinement']={'method':manifest['finalLighting']['noiseFilter'],'rawDirectory':'content/source-assets/lighting/steps78-bake','geometryChanged':False}
# Existing authored surface maps and runtime variants are retained verbatim.
source_bytes=delivery_bytes=0
for name in {a['irradiance'] for a in manifest['assets']}|{f'{s}-{c}.png' for s in manifest['surfaceFamilies'] for c in ('albedo','normal','orm')}:
 src=OUT/name if (OUT/name).exists() else BASE/name
 variant=manifest['textureVariants'].get(name,name);runtime=OUT/variant if (OUT/variant).exists() else BASE/variant
 source_bytes+=src.stat().st_size;delivery_bytes+=runtime.stat().st_size
manifest['deliveryCompression']['sourceBytes']=source_bytes;manifest['deliveryCompression']['deliveryBytes']=delivery_bytes
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'docs/design/steps78-lighting-audit-2026-10-25.json').write_text(json.dumps({'scale':scale,'maps':audit},indent=2)+'\n')
print(json.dumps({'scale':scale,'maps':audit},indent=2))
