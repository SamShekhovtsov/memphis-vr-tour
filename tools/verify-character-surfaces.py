"""Validate the exact source/delivery PBR channel values without browser tooling."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
folder=root/'apps/web-tour/public/assets/authored/people/surfaces-v2'
source=root/'content/source-assets/characters/surfaces-v2'
audit={}
for family in ['skin','hair','linen']:
    for channel in ['albedo','normal','orm']:
        name=family+'-'+channel
        a=np.asarray(Image.open(folder/(name+'.webp')).convert('RGB'))
        b=np.asarray(Image.open(source/(name+'.png')).convert('RGB'))
        assert np.array_equal(a,b),'Lossless delivery mismatch: '+name
        assert a.shape==(512,512,3)
        if channel=='normal':
            assert np.max(abs(np.linalg.norm(a/127.5-1,axis=2)-1))<.015
        if channel=='orm':
            assert (a[:,:,0]==255).all() and (a[:,:,2]==0).all()
            assert a[:,:,1].min()>100
        audit[name]={'min':a.min(axis=(0,1)).tolist(),'max':a.max(axis=(0,1)).tolist()}
(source/'channel-audit.json').write_text(json.dumps(audit,indent=2)+'\n',newline='\n')
print('Exact source/delivery, unit tangent normals and nonmetallic packing passed')
