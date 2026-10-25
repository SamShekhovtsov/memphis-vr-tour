from pathlib import Path
from PIL import Image
import numpy as np
import json
p=Path('docs/design/screenshots');checks={}
pairs=[(s,f'{s}-render-perf-before',f'{s}-render-depth-ready') for s in ['hero-street-main','hero-street-material','street-entry']]
pairs += [(f'route-{n}',f'hero-street-main-render-depth-quality-checkpoint-{n}-before',f'hero-street-main-render-depth-quality-checkpoint-{n}-after') for n in [180,360,600]]
for name,a,b in pairs:
 qa=json.loads((p/(a+'.json')).read_text());qb=json.loads((p/(b+'.json')).read_text())
 for k in ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','groundSection','peopleMaterials','contactShadows','estimatedTextureMiB','textures','renderWidth','renderHeight']:assert qa[k]==qb[k],name+': '+k
 assert sorted(qa['layoutRoots'],key=lambda x:x['name'])==sorted(qb['layoutRoots'],key=lambda x:x['name'])
 x=np.asarray(Image.open(p/(a+'.png')).convert('RGB'));y=np.asarray(Image.open(p/(b+'.png')).convert('RGB'))
 changed=int(np.count_nonzero(np.any(x!=y,axis=2)));maximum=0;elements=0
 for field in ['peoplePoseMatrices','moverPoseMatrices']:
  if field not in qa:continue
  nodes={n['name']:n['world'] for n in qb[field]}
  for n in qa[field]:maximum=max(maximum,float(np.max(np.abs(np.array(n['world'])-np.array(nodes[n['name']])))));elements+=len(n['world'])
 checks[name]={'changedPixels':changed,'poseElements':elements,'maxPoseDifference':maximum,'before':a,'after':b}
 print(name,checks[name]);assert changed==0;assert maximum<1e-6
Path('docs/design/render-depth-image-checks-2026-10-25.json').write_text(json.dumps(checks,indent=2)+'\n')
