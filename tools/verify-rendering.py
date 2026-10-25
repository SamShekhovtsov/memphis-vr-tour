from pathlib import Path
from PIL import Image
import numpy as np
import json,sys,hashlib
root=Path(__file__).resolve().parents[1]
folder=root/'docs/design/screenshots'
partial='--partial' in sys.argv
checks={}
pairs=[(s,f'{s}-render-perf-before',f'{s}-render-perf-after') for s in ['hero-street-main','hero-street-material','street-entry']]
pairs += [(f'route-{n}',f'hero-street-main-render-quality-checkpoint-{n}-before',f'hero-street-main-render-quality-checkpoint-{n}-after') for n in [180,270,360,450,540,600]]
pairs += [('route-90','hero-street-main-render-visual-isolate-legacy-a','hero-street-main-render-visual-isolate-optimized')]
pairs += [(f'route-90-control-{mode}','hero-street-main-render-visual-isolate-legacy-a',f'hero-street-main-render-visual-isolate-{mode}') for mode in ['legacy-b','selection','materials']]
for name,before,after in pairs:
    if partial and not ((folder/(before+'.png')).exists() and (folder/(after+'.png')).exists()):continue
    a=np.asarray(Image.open(folder/(before+'.png')).convert('RGB'));b=np.asarray(Image.open(folder/(after+'.png')).convert('RGB'))
    changed=int(np.count_nonzero(np.any(a!=b,axis=2)))
    qa=json.loads((folder/(before+'.json')).read_text());qb=json.loads((folder/(after+'.json')).read_text())
    for key in ['viewport','camera','animationSeconds','actorAnimationGroups','rendering','groundSection','peopleMaterials','contactShadows','estimatedTextureMiB','textures','renderWidth','renderHeight']:
        assert qa[key]==qb[key],name+': '+key
    assert sorted(qa['layoutRoots'],key=lambda n:n['name'])==sorted(qb['layoutRoots'],key=lambda n:n['name'])
    assert not qb['textureErrors']
    maximum=0;elements=0
    for field in ['peoplePoseMatrices','moverPoseMatrices']:
        if field not in qa:continue
        reference={n['name']:n['world'] for n in qb[field]}
        for node in qa[field]:
            delta=np.max(np.abs(np.array(node['world'])-np.array(reference[node['name']])))
            maximum=max(maximum,float(delta));elements+=len(node['world'])
    checks[name]={'changedPixels':changed,'poseElements':elements,'maxPoseDifference':maximum,'rgbSha256':hashlib.sha256(b.tobytes()).hexdigest()}
    print(name,checks[name],flush=True)
    assert changed==0,name+': rendered pixels changed'
    assert maximum<1e-6,name+': moving pose changed'
if not partial:
    (root/'docs/design/render-performance-image-checks-2026-10-25.json').write_text(json.dumps(checks,indent=2)+'\n')
print(f'{len(checks)} matched view pairs passed')
