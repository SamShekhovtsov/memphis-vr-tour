"""Verify delivered PBR channels and protected screenshot regions independently."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
runtime = root/'apps/web-tour/public/assets/authored/hero-ground'
source = root/'content/source-assets/ground/hero-section-generated'
normal = np.asarray(Image.open(source/'ground-normal.png').convert('RGB'), dtype=np.float32)/255*2-1
length = np.linalg.norm(normal, axis=2)
assert length.min() > .9 and length.max() < 1.02, 'Invalid tangent normal lengths'
assert normal[:,:,2].min() > .2, 'Normal points below the ground'
orm = np.asarray(Image.open(source/'ground-orm.png'))
assert not orm[:,:,2].any(), 'Soil must not become metallic'
assert orm[:,:,1].min() >= .7*255, 'Unexpected glossy soil'
albedo = Image.open(source/'ground-albedo.png')
alpha = np.asarray(albedo.getchannel('A'))
assert not alpha[0,:].any() and not alpha[-1,:].any() and not alpha[:,0].any() and not alpha[:,-1].any(), 'Hard patch boundary'
assert alpha.max() == 255
with Image.open(runtime/'ground-albedo.webp') as decoded:
    assert decoded.getchannel('A').tobytes() == albedo.getchannel('A').tobytes(), 'Blend alpha changed'
for channel in ('normal','orm'):
    with Image.open(source/f'ground-{channel}.png') as original, Image.open(runtime/f'ground-{channel}.webp') as decoded:
        assert original.tobytes() == decoded.tobytes(), 'Physical map compression changed values'
masks = np.asarray(Image.open(source/'ground-masks.png'))
assert all(masks[:,:,channel].max() > 64 and masks[:,:,channel].min() < 64 for channel in range(4)), 'Missing editable layer mask'
height = np.asarray(Image.open(source/'ground-height-source.png'), dtype=np.float32)
assert np.max(np.abs((height/65535-.5)*.024)) < .008, 'Unexpected visual relief scale'
screens = root/'docs/design/screenshots'
protected = {}
for shot in ('hero-street-main','street-entry','hero-street-material'):
    before = np.asarray(Image.open(screens/f'{shot}-ground12-before.png').convert('RGB'), dtype=np.int16)
    after = np.asarray(Image.open(screens/f'{shot}-ground12-after.png').convert('RGB'), dtype=np.int16)
    difference = np.abs(before[:250]-after[:250])
    # FXAA/depth-edge rasterization may vary at coplanar roof edges. Protect
    # surface interiors separately, and report the raw edge differences too.
    edge = np.zeros(difference.shape[:2], dtype=bool)
    for image in (before[:250], after[:250]):
        for axis in (0,1):
            edge |= np.abs(image-np.roll(image,1,axis=axis)).max(axis=2)>8
    expanded = edge.copy()
    for dy in range(-2,3):
        for dx in range(-2,3):
            expanded |= np.roll(np.roll(edge,dy,axis=0),dx,axis=1)
    interior = ~expanded
    fraction = float(((difference.max(axis=2)>1)&interior).sum()/interior.sum())
    assert fraction < .001, f'{shot}: protected roof/sky surface interiors changed'
    assert not difference[:140].any(), f'{shot}: protected upper canopy/sky changed'
    protected[shot] = {'interiorChangedFractionAboveOneCodeValue': fraction,
        'rawChangedFractionAboveOneCodeValue':float((difference.max(axis=2)>1).mean()),
        'maximumRawCodeValueDifference': int(difference.max()), 'edgeExclusionPixels':2, 'top140Exact':True}
floor = np.abs(np.asarray(Image.open(screens/'hero-street-main-ground12-before.png').convert('RGB'), dtype=np.float32)[500:700,400:850]
    -np.asarray(Image.open(screens/'hero-street-main-ground12-after.png').convert('RGB'), dtype=np.float32)[500:700,400:850])
assert floor.mean() > .5, 'Ground material is not visibly active'
report = {'normalLengthRange': [float(length.min()),float(length.max())], 'minimumRoughness':float(orm[:,:,1].min()/255),
    'metallic':0,'physicalChannelCompressionExact':True,'blendAlphaExact':True,'protectedRegions':protected,
    'groundRegionMeanCodeValueDifference':float(floor.mean()),'note':'Channel/region checks do not automatically establish cinematic quality.'}
(root/'docs/design/hero-ground-channel-checks-2026-10-24.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
