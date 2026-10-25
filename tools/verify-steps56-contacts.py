from pathlib import Path
import numpy as np
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
checks={}
for part in ['near','mid','far']:
    original=np.asarray(Image.open(root/f'content/source-assets/lighting/hero-contact-base/{part}-irradiance.png').convert('RGB')).astype(float)
    png=np.asarray(Image.open(root/f'apps/web-tour/public/assets/authored/hero-street/{part}-irradiance.png').convert('RGB')).astype(float)
    webp=np.asarray(Image.open(root/f'apps/web-tour/public/assets/authored/hero-street/{part}-irradiance.webp').convert('RGB')).astype(float)
    assert np.array_equal(png,webp)
    assert (png<=original).all() and (png>=np.floor(original*.82)-1).all()
    assert np.any(png<original)
    checks[part]={'losslessDelivery':True,'boundedIndirectAttenuation':.18,'size':list(png.shape[:2])}
for shot in ['hero-street-main','hero-street-material','street-entry']:
    a=np.asarray(Image.open(root/f'docs/design/screenshots/{shot}-steps56-before.png'))
    b=np.asarray(Image.open(root/f'docs/design/screenshots/{shot}-steps56-control.png'))
    assert np.array_equal(a,b),shot+': baseline control changed'
checks['baselineControls']='All three match the original before capture pixel for pixel'
(root/'docs/design/hero-steps56-contact-checks-2026-10-25.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks))
