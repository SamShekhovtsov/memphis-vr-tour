"""Build a bounded, repeatable PBR ground section from verified CC0 soil maps.

No scene geometry, walkable heights, lightmaps, or camera files are modified.
RGBA masks and 16-bit source height are retained for engine-independent reuse.
"""
from pathlib import Path
import hashlib
import json
import os
import time
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/source-assets/ground/polyhaven-brown-mud-dry'
OUT = ROOT / 'apps/web-tour/public/assets/authored/hero-ground'
OUT.mkdir(parents=True, exist_ok=True)
AUTHORING = ROOT / 'content/source-assets/ground/hero-section-generated'
AUTHORING.mkdir(parents=True, exist_ok=True)
profile = json.loads((ROOT / 'content/scene-data/hero-street.ground-section.json').read_text())
b = profile['bounds']
SIZE = 2048
x = np.linspace(b['minX'], b['maxX'], SIZE, dtype=np.float32)[None, :]
z = np.linspace(b['minZ'], b['maxZ'], SIZE, dtype=np.float32)[:, None]
world_x = np.broadcast_to(x, (SIZE, SIZE))
world_z = np.broadcast_to(z, (SIZE, SIZE))

def smooth(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)

def field(scale, seed):
    rng = np.random.default_rng(seed)
    grid = rng.random((64, 64), dtype=np.float32)
    u = (world_x + 100) / scale
    v = (world_z + 100) / scale
    ix, iz = np.floor(u).astype(int), np.floor(v).astype(int)
    a, c = smooth(u - ix), smooth(v - iz)
    return ((grid[iz % 64, ix % 64] * (1-a) + grid[iz % 64, (ix+1) % 64] * a) * (1-c)
            + (grid[(iz+1) % 64, ix % 64] * (1-a) + grid[(iz+1) % 64, (ix+1) % 64] * a) * c)

# Four seamless orientations, selected over broad, irregular regions. The same
# coordinates and weights sample every physical channel, preserving alignment.
selector = field(2.1, 817)
weights = np.stack([np.exp(-((selector - centre) / .075)**2) for centre in (.2, .4, .6, .8)])
weights /= weights.sum(axis=0)

def sample(file, grey=False):
    image = Image.open(SOURCE / file).convert('L' if grey else 'RGB')
    source = np.asarray(image, dtype=np.float32) / 255
    result = np.zeros((SIZE, SIZE) if grey else (SIZE, SIZE, 3), dtype=np.float32)
    for index in range(4):
        u, v = world_x / 1.3, world_z / 1.3
        if index == 1: u, v = -v, u
        elif index == 2: u, v = -u, -v
        elif index == 3: u, v = v, -u
        u = ((u + index * .317) % 1) * source.shape[1]
        v = ((v + index * .173) % 1) * source.shape[0]
        ix, iz = np.floor(u).astype(int), np.floor(v).astype(int)
        fx, fz = u - ix, v - iz
        if not grey: fx, fz = fx[..., None], fz[..., None]
        sampled = ((source[iz % source.shape[0], ix % source.shape[1]] * (1-fx)
                  + source[iz % source.shape[0], (ix+1) % source.shape[1]] * fx) * (1-fz)
                  + (source[(iz+1) % source.shape[0], ix % source.shape[1]] * (1-fx)
                  + source[(iz+1) % source.shape[0], (ix+1) % source.shape[1]] * fx) * fz)
        weight = weights[index] if grey else weights[index, ..., None]
        result += sampled * weight
    return result

photo = sample('brown_mud_dry_diff_2k.jpg')
height_source = sample('brown_mud_dry_disp_2k.jpg', True)
orm_source = sample('brown_mud_dry_arm_2k.jpg')
centre_x = -6.0 + .18 * np.sin(z * .43)
traffic = np.exp(-((x - centre_x) / 1.35)**4).astype(np.float32)
edge = smooth((np.abs(x + 6.1) - 2.65) / 1.5) * np.ones_like(z)
disturbed = smooth((field(.65, 519) - .48) * 3) * (1 - traffic * .65)
deposits = edge * .65

# Local dust accumulation around the actual existing supports and low props.
anchors = json.loads((ROOT / 'content/scene-data/hero-street.anchors-lock.json').read_text())['anchors']
deposit_count = 0
for anchor in anchors:
    if not any(key in anchor['name'].lower() for key in ('jar', 'basket', 'post', 'bench', 'support')):
        continue
    matrix = anchor['matrix']
    px, pz, py = -matrix[3] - 16.5, -matrix[7], matrix[11]
    if not (b['minX'] < px < b['maxX'] and b['minZ'] < pz < b['maxZ'] and py < .9):
        continue
    radius = .4
    x0 = max(0, int((px-radius-b['minX']) / (b['maxX']-b['minX']) * SIZE))
    x1 = min(SIZE, int((px+radius-b['minX']) / (b['maxX']-b['minX']) * SIZE)+1)
    z0 = max(0, int((pz-radius-b['minZ']) / (b['maxZ']-b['minZ']) * SIZE))
    z1 = min(SIZE, int((pz+radius-b['minZ']) / (b['maxZ']-b['minZ']) * SIZE)+1)
    deposits[z0:z1, x0:x1] += .18 * np.exp(-((world_x[z0:z1, x0:x1]-px)**2 + (world_z[z0:z1, x0:x1]-pz)**2) / .07)
    deposit_count += 1
deposits = np.clip(deposits, 0, 1)

# Sparse, shallow bare-foot impressions; no tyre or shoe-tread pattern.
impressions = np.zeros((SIZE, SIZE), dtype=np.float32)
for index in range(9):
    px, pz = -6.25 + (-1)**index * .12 + .07*np.sin(index*1.7), -18.5 + index * .63
    foot = np.exp(-(((world_x-px)/.043)**2 + ((world_z-pz)/.105)**2) * 2)
    for toe in range(5):
        toe_x = px + (-1)**index * (-.028 + toe*.014)
        toe_z = pz + .10 - toe*.004
        foot = np.maximum(foot, .65*np.exp(-(((world_x-toe_x)/(.011-toe*.001))**2 + ((world_z-toe_z)/.012)**2)*2))
    impressions = np.maximum(impressions, foot.astype(np.float32) * (.5 + .3*np.sin(index*.8)**2))

macro = (field(3.2, 113) - .5) * .025
contrast = .92 - .22*traffic + .1*disturbed
albedo = (photo - photo.mean(axis=(0,1))) * contrast[..., None] + np.array([.60, .515, .405], dtype=np.float32)
albedo += macro[..., None] + deposits[..., None] * np.array([.018, .016, .012])
albedo -= impressions[..., None] * .018
roughness = np.clip(orm_source[..., 1] * .42 + .48 - traffic*.075 + deposits*.035, .74, .98)
ao = np.clip(1 - (1-orm_source[..., 0]) * (.2 + .25*disturbed) * (1-.65*traffic), .72, 1)
# Millimetres of visual relief. This height is never applied to the mesh.
height = (height_source - .5) * (.012 - traffic*.006) - impressions * .0012
height += (field(.035, 823) - .5) * .0006
dz, dx = np.gradient(height, (b['maxZ']-b['minZ'])/(SIZE-1), (b['maxX']-b['minX'])/(SIZE-1))
normal = np.stack((-dx, -dz, np.ones_like(dx)), axis=2)
normal /= np.linalg.norm(normal, axis=2)[..., None]
fade = smooth((world_x-b['minX'])/profile['fadeMetres']['x']) * smooth((b['maxX']-world_x)/profile['fadeMetres']['x'])
fade *= smooth((world_z-b['minZ'])/profile['fadeMetres']['z']) * smooth((b['maxZ']-world_z)/profile['fadeMetres']['z'])

def atomic_image(image, file, **options):
    temporary = file.with_suffix(file.suffix + '.tmp')
    image.save(temporary, format='WEBP' if file.suffix == '.webp' else 'PNG', **options)
    for attempt in range(12):
        try:
            os.replace(temporary, file)
            break
        except OSError:
            if attempt == 11: raise
            time.sleep(.25)

def save(name, values, size=SIZE):
    image = Image.fromarray(np.uint8(np.clip(values, 0, 1)*255 + .5))
    if size != SIZE:
        if name == 'ground-masks':
            # The fourth channel is data, not opacity. RGBA resizing otherwise
            # premultiplies and destroys the other masks wherever it is zero.
            image = Image.merge('RGBA', tuple(channel.resize((size,size), Image.Resampling.LANCZOS) for channel in image.split()))
        else:
            image = image.resize((size, size), Image.Resampling.LANCZOS)
    atomic_image(image, AUTHORING / (name + '.png'))
    if name == 'ground-masks':
        # Preserve all four data channels in PNG; alpha isn't coverage here.
        (AUTHORING / 'ground-masks.webp').unlink(missing_ok=True)
        return
    destination = AUTHORING if name == 'ground-masks' else OUT
    atomic_image(image, destination / (name + '.webp'), lossless=name != 'ground-albedo', quality=92, method=6)
    if name == 'ground-albedo':
        with Image.open(destination / (name + '.webp')) as decoded:
            assert image.getchannel('A').tobytes() == decoded.getchannel('A').tobytes(), 'Ground blend boundary changed in compression'
    if name != 'ground-albedo':
        with Image.open(destination / (name + '.webp')) as decoded:
            assert image.tobytes() == decoded.tobytes(), 'Physical-channel compression changed values'

save('ground-albedo', np.dstack((albedo, fade)))
save('ground-normal', normal*.5 + .5, 1024)
save('ground-orm', np.stack((ao, roughness, np.zeros_like(ao)), axis=2), 1024)
save('ground-masks', np.stack((traffic, deposits, disturbed, impressions), axis=2), 1024)
atomic_image(Image.fromarray(np.uint16(np.clip(height/.024 + .5, 0, 1)*65535)), AUTHORING / 'ground-height-source.png')
sources = {file.name: hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted(SOURCE.glob('*.jpg'))}
runtime = {file: {'bytes': (OUT/file).stat().st_size, 'sha256': hashlib.sha256((OUT/file).read_bytes()).hexdigest()}
           for file in profile['maps'].values()}
manifest = {'id': profile['id'], 'source': {'asset': 'brown_mud_dry', 'author': 'Rob Tuytel',
    'url': 'https://polyhaven.com/a/brown_mud_dry', 'license': 'CC0-1.0', 'licenseUrl': 'https://polyhaven.com/license', 'sha256': sources},
    'bounds': b, 'depositAnchors': deposit_count, 'seed': [817,519,113,823], 'sourceTileMetres': 1.3,
    'maskChannels': ['traffic compaction','edge/prop deposits','disturbed soil','bare-foot impressions'],
    'normalConvention': 'OpenGL tangent: R=world X, G=world Z, B=up; renderer converts to world X/Y/Z',
    'heightEncoding': '16-bit; metres=(value/65535-0.5)*0.024; offline only',
    'authoringDirectory': str(AUTHORING.relative_to(ROOT)).replace('\\', '/'),
    'compression': {'albedo': 'WebP quality 92; alpha retained', 'physicalChannels': 'lossless WebP; decoded-byte verified'},
    'runtime': runtime, 'collisionOrGeometryChanged': False}
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'runtimeBytes': sum(entry['bytes'] for entry in runtime.values()), 'depositAnchors': deposit_count}), flush=True)
