from pathlib import Path
from PIL import Image
import numpy as np
import json
p=Path('docs/design/screenshots');checks={}
pairs=[]
for tier in ['balanced','cinematic']:
 for n in [180,360,600]:
  label=f'hero-street-main-render-tour-{tier}-quality-checkpoint-{n}'
  pairs.append((f'{tier}-route-{n}',label+'-before',label+'-after'))
for shot in ['hero-street-main','hero-street-material','street-entry']:
 label=f'{shot}-render-tour-cinematic-still'
 pairs.append((f'cinematic-{shot}',label+'-before',label+'-after'))
for name,a,b in pairs:
 qa=json.loads((p/(a+'.json')).read_text());qb=json.loads((p/(b+'.json')).read_text())
 for k in ['viewport','quality','camera','animationSeconds','actorAnimationGroups','rendering','groundSection','peopleMaterials','contactShadows','estimatedTextureMiB','textures','renderWidth','renderHeight']:assert qa[k]==qb[k],name+': '+k
 assert sorted(qa['layoutRoots'],key=lambda x:x['name'])==sorted(qb['layoutRoots'],key=lambda x:x['name'])
 assert not qa['textureErrors'] and not qb['textureErrors']
 x=np.asarray(Image.open(p/(a+'.png')).convert('RGB'));y=np.asarray(Image.open(p/(b+'.png')).convert('RGB'))
 changed=int(np.count_nonzero(np.any(x!=y,axis=2)));maximum=0;elements=0
 for field in ['peoplePoseMatrices','moverPoseMatrices']:
  if field not in qa:continue
  nodes={n['name']:n['world'] for n in qb[field]}
  for n in qa[field]:maximum=max(maximum,float(np.max(np.abs(np.array(n['world'])-np.array(nodes[n['name']])))));elements+=len(n['world'])
 checks[name]={'changedPixels':changed,'maxChannelDelta':int(np.max(np.abs(x.astype(int)-y.astype(int)))),'poseElements':elements,'maxPoseDifference':maximum,'before':a,'after':b}
 print(name,checks[name],flush=True)
 assert maximum<1e-6,name+': pose changed'
Path('docs/design/render-tour-image-checks-2026-10-25.json').write_text(json.dumps(checks,indent=2)+'\n')
assert all(v['changedPixels']==0 for v in checks.values()),'Non-identical image pairs require investigation; raw captures retained'
