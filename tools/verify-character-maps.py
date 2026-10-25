from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
folder=root/'apps/web-tour/public/assets/authored/people'
results={}
for family in ['skin','hair','linen']:
    for channel in ['albedo','normal','orm']:
        stem=folder/(family+'-'+channel)
        png=np.asarray(Image.open(str(stem)+'.png').convert('RGB'))
        webp=np.asarray(Image.open(str(stem)+'.webp').convert('RGB'))
        assert np.array_equal(png,webp),'Delivery changed PBR channel values'
        assert webp.shape==(512,512,3)
        if channel=='normal':
            length=np.linalg.norm(webp.astype(float)/127.5-1,axis=2)
            assert np.max(np.abs(length-1))<.015
        if channel=='orm':
            assert (webp[:,:,0]==255).all() and (webp[:,:,2]==0).all()
            assert webp[:,:,1].min()>=100
    results[family]='512x512 RGB; exact lossless delivery, unit normals, nonmetallic roughness'
for shot in ['hero-street-main','hero-street-material','street-entry']:
    a=np.asarray(Image.open(root/f'docs/design/screenshots/{shot}-people-materials-before.png'))
    b=np.asarray(Image.open(root/f'docs/design/screenshots/{shot}-people-materials-control.png'))
    assert np.array_equal(a,b),'Legacy control changed the original scene'
results['legacyControls']='All three original and control images match pixel for pixel'
(root/'docs/design/hero-people-material-channel-checks-2026-10-25.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))
