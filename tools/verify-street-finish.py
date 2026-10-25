from pathlib import Path
from PIL import Image
import numpy as np,json
p=Path('docs/design/screenshots');checks={}
def qa(n):return json.loads((p/(n+'.json')).read_text())
def rgb(n):return np.asarray(Image.open(p/(n+'.png')).convert('RGB'))
def matched(a,b):
 x,y=qa(a),qa(b)
 for k in ['viewport','camera','animationSeconds','actorAnimationGroups','groundSection','peopleMaterials']:assert x[k]==y[k],k
 assert sorted(x['layoutRoots'],key=lambda x:x['name'])==sorted(y['layoutRoots'],key=lambda x:x['name'])
 assert not y['textureErrors']
def difference(a,b):
 x=rgb(a).astype(float);y=rgb(b).astype(float);d=np.abs(x-y);mse=float(np.mean(d*d));return {'changedPixels':int(np.count_nonzero(np.any(d>0,axis=2))),'meanChannelError':float(d.mean()),'p99ChannelError':float(np.percentile(d,99)),'maximumChannelError':float(d.max()),'psnrDb':None if mse==0 else float(10*np.log10(255**2/mse))}
for s in ['hero-street-main','hero-street-material','street-entry']:
 before=s+'-steps78-before';final=s+'-steps78-final';matched(before,final)
 checks[s]={'beforeAfter':difference(before,final)}
 control=s+'-steps78-webp';matched(final,control);assert difference(final,control)['changedPixels']==0,'Final capture not reproducible'
 ktx=s+'-steps78-ktx';fallback=s+'-steps78-fallback'
 for n in [ktx,fallback]:matched(control,n)
 error=difference(control,ktx);checks[s]['compression']=error
 checks[s]['compressionThresholdPass']=error['meanChannelError']<=.5 and error['p99ChannelError']<=3
 stats=qa(ktx)['rendering']['textureTrial'];assert len(stats['maps'])==3 and all(m['status']=='ready' and m['format']==36492 for m in stats['maps'])
 fallbackstats=qa(fallback)['rendering']['textureTrial'];assert all(m['status']=='fallback-ready' for m in fallbackstats['maps'])
 checks[s]['fallback']=difference(control,fallback);assert checks[s]['fallback']['changedPixels']==0,'Lossless fallback changed pixels'
for frame in [180,360,600]:
 a=f'hero-street-main-steps78-route-before-checkpoint-{frame}-after';b=f'hero-street-main-steps78-route-after-checkpoint-{frame}-after';matched(a,b)
 x,y=qa(a),qa(b);maximum=0;elements=0
 for field in ['peoplePoseMatrices','moverPoseMatrices']:
  nodes={n['name']:n['world'] for n in y[field]}
  for n in x[field]:maximum=max(maximum,float(np.max(np.abs(np.array(n['world'])-np.array(nodes[n['name']])))));elements+=len(n['world'])
 assert maximum<1e-6
 checks[f'route-{frame}']={'maxPoseDifference':maximum,'matrixElements':elements,'difference':difference(a,b)}
checks['baselineReproduction']=difference('hero-street-main-steps78-before','hero-street-main-steps78-reproduce-before');assert checks['baselineReproduction']['changedPixels']==0
# A simple whole-frame clipping audit supplements manual lit/shaded view inspection.
for s in ['hero-street-main','hero-street-material','street-entry']:
 x=rgb(s+'-steps78-final');checks[s]['displayChannelsAt255']=int(np.count_nonzero(x==255))
Path('docs/design/steps78-image-checks-2026-10-25.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2));assert all(v['compressionThresholdPass'] for k,v in checks.items() if 'compressionThresholdPass' in v),'Compression remains experimental: image error threshold failed'
