from pathlib import Path
from PIL import Image
import numpy as np
import json,hashlib
root=Path(__file__).resolve().parents[1]
folder=root/'docs/design/screenshots'
checks={}
for shot in ['hero-street-main','hero-street-material','street-entry']:
    arrays={p:np.asarray(Image.open(folder/f'{shot}-steps56-perf-{p}.png').convert('RGB')) for p in ['before','control','after']}
    assert np.array_equal(arrays['before'],arrays['control']),shot+': old-code control differs'
    assert np.array_equal(arrays['before'],arrays['after']),shot+': optimization changed the image'
    checks[shot]={'beforeControlIdentical':True,'beforeAfterIdentical':True,'changedPixels':0,'rgbSha256':hashlib.sha256(arrays['after'].tobytes()).hexdigest()}
output=root/'docs/design/hero-people-performance-image-checks-2026-10-25.json'
output.write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks))
