"""Lossless delivery compression; does not claim GPU texture-memory savings."""
from pathlib import Path
from PIL import Image
import json
import os
import time
root=Path(__file__).resolve().parents[1]/'apps/web-tour/public/assets/authored/hero-street'
manifest=json.loads((root/'manifest.json').read_text())
names={a['irradiance'] for a in manifest['assets']}
names.update(f'{surface}-{channel}.png' for surface in ('dust','plaster','linen','pottery','wood') for channel in ('albedo','normal','orm'))
variants={}; before=after=0
for name in sorted(names):
    source=root/name; output=source.with_suffix('.webp')
    temporary=output.with_suffix('.webp.tmp')
    with Image.open(source) as image:
        image=image.convert('RGB'); image.save(temporary,'WEBP',lossless=True,method=6)
        with Image.open(temporary) as decoded:
            assert image.tobytes()==decoded.convert('RGB').tobytes(),f'Changed channel values: {name}'
    for attempt in range(12):
        try:
            os.replace(temporary,output)
            break
        except OSError:
            if attempt==11: raise
            time.sleep(.25)
    before+=source.stat().st_size
    if output.stat().st_size < source.stat().st_size:
        variants[name]=output.name;after+=output.stat().st_size
    else: after+=source.stat().st_size
manifest['textureVariants']=variants
manifest['deliveryCompression']={'format':'lossless WebP with PNG fallback','sourceBytes':before,'deliveryBytes':after,'gpuMemoryReduced':False}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest['deliveryCompression']))
