"""Bake the approved GLB street, without changing object placement or camera.

Run with Blender --background --python tools/blender/bake_hero_street.py.
Inputs are the checked-in generated chunks; outputs are separately maintained.
UV0 = surface detail; UV1 = non-overlapping irradiance atlas.
Lighting is Cycles sky diffuse + sun bounce, WITHOUT surface colour. The
browser multiplies it by albedo through PBR ambient; sun direct is real-time.
"""
import bpy
import bmesh
import json
import math
import os
import hashlib
import sys
import time
import re
import struct
from pathlib import Path
from mathutils import Vector
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from refine_hero_surfaces import refine_surfaces
from export_hero_chunk import export_chunk

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'apps/web-tour/public/assets/generated/glb'
OUT = Path(os.environ.get('EGYPTVR_HERO_OUT', str(ROOT / 'apps/web-tour/public/assets/authored/hero-street')))
OUT.mkdir(parents=True, exist_ok=True)
SIZE = int(os.environ.get('EGYPTVR_BAKE_SIZE', '2048'))
SAMPLES = int(os.environ.get('EGYPTVR_BAKE_SAMPLES', '48'))

def save_image(name, rgb, linear=True):
    height, width = rgb.shape[:2]
    im = bpy.data.images.new(name, width, height, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color' if linear else 'sRGB'
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0, 1)
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = str(OUT / name)
    im.file_format = 'PNG'
    # Windows file watchers can briefly hold an existing texture open.
    for attempt in range(4):
        try:
            im.save()
            break
        except RuntimeError:
            if attempt == 3: raise
            time.sleep(.5)
    return im

def noise(n, cells, seed):
    rng = np.random.default_rng(seed)
    grid = rng.random((cells, cells)).astype(np.float32)
    xy = np.arange(n, dtype=np.float32) * cells / n
    ix = np.floor(xy).astype(int)
    f = xy - ix
    f = f*f*(3-2*f)
    a = grid[ix[:, None] % cells, ix[None, :] % cells]
    b = grid[ix[:, None] % cells, (ix[None, :]+1) % cells]
    c = grid[(ix[:, None]+1) % cells, ix[None, :] % cells]
    d = grid[(ix[:, None]+1) % cells, (ix[None, :]+1) % cells]
    return (a*(1-f[None, :])+b*f[None, :])*(1-f[:, None]) + (c*(1-f[None, :])+d*f[None, :])*f[:, None]

def surface_maps(kind, base, seed):
    n = 1024
    broad = noise(n, 5, seed)
    medium = noise(n, 29, seed+1)
    grain = noise(n, 180, seed+2)
    fine = np.random.default_rng(seed).random((n, n)).astype(np.float32)
    # Multi-scale variation, no repeated brick grid, stripes or painted shadows.
    h = .42*medium + .25*grain + .06*fine
    pits = np.maximum(0, (noise(n, 95, seed+4)-.73)) * 1.6
    h -= pits
    if kind == 'dust':
        h += .25*broad
    else:
        h += .12*broad
    variation = (broad-.5)*.14 + (medium-.5)*.08 + (grain-.5)*.055 - pits*.10
    if kind == 'plaster':
        # Broad hand-applied lime variation, restrained fine surface chatter.
        variation = (broad-.5)*.10 + (medium-.5)*.045 + (grain-.5)*.018 - pits*.045
        h = .22*medium + .10*grain + .02*fine + .12*broad - pits*.4
    rgb = np.array(base, dtype=np.float32)[None,None,:] + variation[:,:,None]
    save_image(f'{kind}-albedo.png', rgb, False)
    dx = (np.roll(h, -1, 1)-np.roll(h, 1, 1))*2.2
    dy = (np.roll(h, -1, 0)-np.roll(h, 1, 0))*2.2
    normals = np.stack((-dx, -dy, np.ones_like(dx)), axis=2)
    normals /= np.linalg.norm(normals, axis=2)[:,:,None]
    save_image(f'{kind}-normal.png', normals*.5+.5)
    orm = np.stack((np.clip(1-pits*.25, 0, 1), .83+grain*.13, np.zeros_like(grain)), axis=2)
    save_image(f'{kind}-orm.png', orm)
    save_image(f'{kind}-height.png', np.repeat(h[:,:,None], 3, axis=2))

def material_id(name):
    n = name.lower()
    if n.startswith('hero-finish-plaster'): return 'hero-plaster'
    if n.startswith('hero-finish-linen'): return 'hero-linen'
    if 'packed sandy street dust' in n: return 'dust'
    if 'plaster' in n or 'mudbrick' in n: return 'plaster'
    if 'linen' in n or 'cloth' in n: return 'linen'
    if 'pottery' in n or 'clay' in n: return 'pottery'
    if 'wood' in n or 'acacia' in n: return 'wood'
    return 'original'

def prop_maps(kind, base, seed):
    n = 512
    broad = noise(n, 8, seed)
    grain = noise(n, 100, seed+1)
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)/n
    if kind == 'linen':
        relief = .012*(np.sin(x*math.tau*96) + np.sin(y*math.tau*96))
        tone = (broad-.5)*.055 + relief*.18
        roughness = .94 + (grain-.5)*.04
    elif kind == 'wood':
        relief = .022*np.sin((x*28 + .28*np.sin(y*math.tau*2))*math.tau)
        tone = (broad-.5)*.065 + relief
        roughness = .86 + (grain-.5)*.09
    else:
        relief = .009*np.sin(y*math.tau*72) + (grain-.5)*.018
        tone = (broad-.5)*.065 + (grain-.5)*.012
        roughness = .8 + (broad-.5)*.12
    rgb = np.array(base)[None,None,:] + tone[:,:,None]
    save_image(f'{kind}-albedo.png', rgb, False)
    dx = np.roll(relief,-1,1)-np.roll(relief,1,1)
    dy = np.roll(relief,-1,0)-np.roll(relief,1,0)
    normals = np.stack((-dx,-dy,np.ones_like(dx)),axis=2)
    normals /= np.linalg.norm(normals,axis=2)[:,:,None]
    save_image(f'{kind}-normal.png', normals*.5+.5)
    save_image(f'{kind}-orm.png', np.stack((np.ones_like(x),roughness,np.zeros_like(x)),axis=2))

surface_maps('dust', (.57,.49,.38), 710)
surface_maps('plaster', (.72,.66,.54), 924)
prop_maps('linen', (.78,.70,.55), 126)
prop_maps('pottery', (.66,.43,.29), 372)
prop_maps('wood', (.48,.37,.25), 813)

def foreground_maps(kind):
    n = 1024
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)/n
    broad, fine = noise(n, 7, 424), noise(n, 190, 425)
    if kind == 'hero-plaster':
        # Metres of relief over a two-metre UV tile. Uneven trowel passes,
        # restrained mineral grain and small pores, without a brick grid.
        trowel = noise(n, 27, 426)
        h = .0014*trowel + .0005*fine + .0002*np.sin((x*19+y*3)*math.tau)
        tone = (broad-.5)*.055 + (trowel-.5)*.025 + (fine-.5)*.012
        base, metres, rough = (.77,.713,.61), 2, .90+(fine-.5)*.06
    else:
        # Approximately 1.6mm threads; avoid the old coarse checker pattern.
        h = .000035*(np.sin(x*math.tau*310)+np.sin(y*math.tau*310))
        h += .000015*(fine-.5)
        tone = (broad-.5)*.035 + (fine-.5)*.008
        base, metres, rough = (.80,.735,.62), .5, .95+(fine-.5)*.025
    save_image(f'{kind}-albedo.png', np.array(base)[None,None,:]+tone[:,:,None], False)
    dx = (np.roll(h,-1,1)-np.roll(h,1,1))/(2*metres/n)
    dy = (np.roll(h,-1,0)-np.roll(h,1,0))/(2*metres/n)
    normal = np.stack((-dx,-dy,np.ones_like(dx)),axis=2)
    normal /= np.linalg.norm(normal,axis=2)[:,:,None]
    save_image(f'{kind}-normal.png', normal*.5+.5)
    save_image(f'{kind}-orm.png',np.stack((np.ones_like(x),rough,np.zeros_like(x)),axis=2))

foreground_maps('hero-plaster')
foreground_maps('hero-linen')
SURFACES = ('dust','plaster','linen','pottery','wood','hero-plaster','hero-linen')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
chunks = []
for part in ('near', 'mid', 'far'):
    # A glTF alpha factor may be linked into the imported shader graph. Reading
    # only BSDF Alpha.default_value then returns 1 and retains old decal sheets
    # as opaque geometry. Use the source's explicit glTF material semantics.
    source_bytes = (SOURCE / f'hero_street_corridor_{part}.glb').read_bytes()
    json_size = struct.unpack_from('<I', source_bytes, 12)[0]
    source_document = json.loads(source_bytes[20:20+json_size])
    material_key = lambda name: re.sub(r'\.\d+$', '', name)
    retired_sheets = {material_key(m['name']) for m in source_document['materials']
                      if m.get('alphaMode', 'OPAQUE') == 'BLEND'
                      and m.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1,1,1,1])[3] < .99}
    previous = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / f'hero_street_corridor_{part}.glb'))
    meshes = [o for o in set(bpy.context.scene.objects)-previous if o.type == 'MESH']
    for obj in meshes:
        # Retire painted shadow/haze/grime sheets. Real material masks and
        # geometric occlusion replace them. Structural opaque geometry stays.
        bm = bmesh.new(); bm.from_mesh(obj.data)
        remove = []
        for face in bm.faces:
            mat = obj.data.materials[face.material_index]
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if material_key(mat.name) in retired_sheets or (bsdf and bsdf.inputs['Alpha'].default_value < .99):
                remove.append(face)
        bmesh.ops.delete(bm, geom=remove, context='FACES')
        bm.to_mesh(obj.data); bm.free()
        if not len(obj.data.polygons):
            bpy.data.objects.remove(obj, do_unlink=True)
    meshes = [o for o in bpy.context.scene.objects if o in meshes and o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = f'hero-street-{part}-baked'
    # glTF splits vertices at normal/material seams. Weld coincident vertices
    # before unwrapping so a wall gets an island, not hundreds of triangles.
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00001)
    bm.to_mesh(obj.data); bm.free()
    refine_surfaces(obj, material_id)
    obj.data.color_attributes.render_color_index = obj.data.color_attributes.find('HeroFinish')
    # Make each chunk's materials independent so bake targets never alias.
    for slot in obj.material_slots:
        slot.material = slot.material.copy()
        slot.material['surfaceId'] = material_id(slot.material.name)
        mat = slot.material
        sid = mat['surfaceId']
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        if sid in SURFACES:
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(str(OUT/f'{sid}-albedo.png'), check_existing=True)
            uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
            uv.uv_map = obj.data.uv_layers[0].name
            mat.node_tree.links.new(uv.outputs['UV'], tex.inputs['Vector'])
            mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    uv0 = obj.data.uv_layers[0]
    for poly in obj.data.polygons:
        sid = obj.data.materials[poly.material_index]['surfaceId']
        if sid not in SURFACES: continue
        for li in poly.loop_indices:
            v = obj.matrix_world @ obj.data.vertices[obj.data.loops[li].vertex_index].co
            normal = poly.normal
            if abs(normal.z) > .65: u, w = v.x, v.y
            elif abs(normal.x) > abs(normal.y): u, w = v.y, v.z
            else: u, w = v.x, v.z
            scale = 2 if sid in ('dust', 'plaster', 'hero-plaster') else .5
            uv0.data[li].uv = (u/scale, w/scale)
    obj.data.uv_layers.new(name='LightmapUV')
    obj.data.uv_layers.active_index = 1
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.0015)
    bpy.ops.object.mode_set(mode='OBJECT')
    chunks.append((part,obj))

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 4
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.60,.72,1,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .45
sun_data = bpy.data.lights.new('locked-sun', 'SUN')
sun_data.energy = 2.0
sun_data.angle = math.radians(3)
sun_data.color = (1,.89,.72)
sun = bpy.data.objects.new('locked-sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = Vector((.62,-.27,-.74)).to_track_quat('-Z','Y').to_euler()
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = False
scene.render.bake.margin = 4
scene.render.bake.use_clear = True
bindings = []
material_bindings = {}
for part, obj in chunks:
    im = bpy.data.images.new(f'{part}-irradiance', SIZE, SIZE, alpha=False, float_buffer=True)
    im.colorspace_settings.name = 'Non-Color'
    for mat in obj.data.materials:
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = im
        mat.node_tree.nodes.active = node
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    print(f'BAKING sky {part}: {len(obj.data.polygons)} faces, {SIZE}px, {SAMPLES} samples', flush=True)
    sun.hide_render = True
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .45
    scene.render.bake.use_pass_direct = True
    bpy.ops.object.bake(type='DIFFUSE', uv_layer='LightmapUV')
    # Store linear irradiance explicitly, avoiding display transforms.
    pixels = np.empty(SIZE*SIZE*4, dtype=np.float32)
    im.pixels.foreach_get(pixels)
    rgb = pixels.reshape((SIZE,SIZE,4))[:,:,:3].copy()
    print(f'BAKING sun bounce {part}', flush=True)
    sun.hide_render = False
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    scene.render.bake.use_pass_direct = False
    bpy.ops.object.bake(type='DIFFUSE', uv_layer='LightmapUV')
    im.pixels.foreach_get(pixels)
    rgb += pixels.reshape((SIZE,SIZE,4))[:,:,:3]
    save_image(f'{part}-irradiance.png', rgb)
    binding, chunk_materials = export_chunk(OUT, scene, part, obj)
    bindings.append(binding)
    material_bindings.update(chunk_materials)
    print(f'EXPORTED {part}', flush=True)

manifest = {
  'id':'hero-street-authored-v2', 'units':'meters', 'format':'glTF 2.0',
  'source':'Existing locked project-authored street GLBs; no external media',
  'evidenceLevel':'inferred', 'lightingEvidenceLevel':'speculative',
  'sunDirectionBabylon':[-.62,-.74,.27],
  'bake':{'engine':'Cycles','samples':SAMPLES,'resolution':SIZE,'passes':['sky-diffuse-direct','sky-diffuse-indirect','sun-diffuse-indirect'],'includesAlbedo':False,'includesSunDirect':False,'colorSpace':'linear','uvSet':1},
  'surfaceTextureMeters':2, 'normalConvention':'glTF tangent space',
  'surfaceFamilies':list(SURFACES),
  'foregroundFinish':{'sourceYBounds':[10.5,19.2], 'facadeInwardReliefMaxMeters':.007, 'originalFacadeVertices':'fixed during relief; corners rounded inward', 'clothSupportCorners':'fixed', 'additionalProps':0, 'vertexColour':'opaque normalized RGBA8 COLOR_0, white outside finish region', 'canopyAdditionalSagMaxMeters':.24, 'awningAdditionalSagMaxMeters':.12, 'plasterEdgeBevelMeters':.035, 'potteryLipBevelMeters':.007, 'timberEdgeBevelMeters':.003, 'hemEdges':4},
  'surfaceScaleMeters':{'dust':2,'plaster':2,'linen':.5,'pottery':.5,'wood':.5,'hero-plaster':2,'hero-linen':.5},
  'surfaceRefinement':{'plasterBevelMeters':.018,'clothFoldMaxMeters':.04,'clothSagMaxMeters':.18,'clothThicknessMeters':.003,'hemHeightMeters':.004,'woodBendMaxMeters':.006,'potteryLipBevelMeters':.004,'potteryBulgeMaxMeters':.018,'objectTransforms':'unchanged','retiredSheets':'source glTF BLEND alpha factors below 0.99'},
  'packing':{'r':'ambient occlusion','g':'roughness','b':'metallic'},
  'assets':bindings, 'materials':material_bindings,
  'lockedInputs': {str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'content/scene-data/hero-street.camera-lock.json', ROOT/'content/scene-data/memphis-white-walls.tour.json']},
  'sourceHashes': {a['fileName']:hashlib.sha256((SOURCE/a['fileName']).read_bytes()).hexdigest() for a in bindings}
}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Editable source includes original placement, UVs, lights and bake targets.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'content/generated/hero-street-bake.blend'))
print('Hero street baking finished.', flush=True)
