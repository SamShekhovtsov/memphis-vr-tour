"""Filter low-sample indirect-light noise; leave albedo, geometry and UVs intact.

Run after baking, before lossless WebP conversion. --fresh archives the newly
baked PNGs; otherwise repeated runs use the archived raw input, never a filtered
output. Four-pixel bake gutters exceed the local filter footprint.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import hashlib
import json
import shutil
import sys
import os
import time

root = Path(__file__).resolve().parents[1]
target = root / 'apps/web-tour/public/assets/authored/hero-street'
archive = root / 'content/generated/hero-street-irradiance-raw'
archive.mkdir(parents=True, exist_ok=True)
manifest = json.loads((target / 'manifest.json').read_text())
if '--fresh' in sys.argv and 'irradianceRefinement' in manifest:
    raise RuntimeError('These maps are already filtered. Reuse the raw cache without --fresh, or run the bake first.')
sources = {}
for asset in manifest['assets']:
    name = asset['irradiance']
    raw = archive / name
    if not raw.exists() and 'irradianceRefinement' in manifest:
        raise RuntimeError('Raw bake cache is missing. Rebuild the bake before filtering; do not filter a filtered output.')
    if '--fresh' in sys.argv or not raw.exists():
        shutil.copyfile(target / name, raw)
    sources[name] = hashlib.sha256(raw.read_bytes()).hexdigest()
    with Image.open(raw) as source:
        # The median rejects isolated bright bounce samples. A small spatial
        # filter stabilizes the remaining grain without broad shadow blurring.
        output = source.convert('RGB').filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(.8))
        temporary = target / (name + '.filtered.tmp')
        output.save(temporary, format='PNG')
        # Vite/Windows image watchers can briefly retain an open destination.
        for attempt in range(12):
            try:
                os.replace(temporary, target / name)
                break
            except OSError:
                if attempt == 11:
                    raise
                time.sleep(.25)
    print(f'Filtered indirect light: {name}')
manifest['irradianceRefinement'] = {
    'method': '3x3 median then 0.8-pixel Gaussian on linear RGB irradiance only',
    'rawDirectory': str(archive.relative_to(root)).replace('\\', '/'),
    'rawSha256': sources,
    'geometryChanged': False,
}
(target / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
