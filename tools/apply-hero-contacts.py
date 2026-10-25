"""Bounded visibility correction on linear irradiance only; no albedo changes."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'content/source-assets/lighting/hero-contact-base'
OUT=ROOT/'apps/web-tour/public/assets/authored/hero-street'
records={}
for part in ('near','mid','far'):
    source=ROOT/f'content/generated/steps56-ao/{part}-contact-ao.png'
    with Image.open(source) as image:
        ao=np.asarray(image.convert('L').filter(ImageFilter.GaussianBlur(.55)).resize((2048,2048),Image.Resampling.BILINEAR),dtype=float)/255
    with Image.open(BASE/f'{part}-irradiance.png') as image:original=np.asarray(image.convert('RGB'),dtype=float)
    gain=.82+.18*ao
    result=np.uint8(np.clip(np.rint(original*gain[:,:,None]),0,255))
    image=Image.fromarray(result,'RGB')
    # Offline pipeline runs with no captures: write existing files directly
    # because Windows readers can deny replacement while allowing writes.
    image.save(OUT/f'{part}-irradiance.png')
    image.save(OUT/f'{part}-irradiance.webp',lossless=True,method=6)
    with Image.open(OUT/f'{part}-irradiance.webp') as decoded:assert decoded.convert('RGB').tobytes()==image.tobytes()
    records[part]={'source':str(source.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'minGain':float(gain.min()),'maxGain':float(gain.max()),'meanGain':float(gain.mean())}
manifest=json.loads((BASE/'manifest.json').read_text())
manifest['contactPolish']={'date':'2026-10-25','distanceMeters':.4,'resolution':1024,'maxIndirectAttenuation':.18,'affects':'existing linear sky/bounce only','geometryAndUvsChanged':False,'movingActorsBaked':False,'maps':records}
names={a['irradiance'] for a in manifest['assets']}
names.update(f'{s}-{c}.png' for s in manifest['surfaceFamilies'] for c in ('albedo','normal','orm'))
before=after=0
for name in names:
    source=OUT/name;variant=OUT/manifest['textureVariants'].get(name,name)
    before+=source.stat().st_size;after+=variant.stat().st_size
manifest['deliveryCompression']['sourceBytes']=before
manifest['deliveryCompression']['deliveryBytes']=after
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'contacts':records,'runtimeTextureBytes':after}))
