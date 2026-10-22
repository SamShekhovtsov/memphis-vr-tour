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
from pathlib import Path
from mathutils import Vector
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from refine_hero_surfaces import refine_surfaces

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'apps/web-tour/public/assets/generated/glb'
OUT = ROOT / 'apps/web-tour/public/assets/authored/hero-street'
OUT.mkdir(parents=True, exist_ok=True)
SIZE = int(os.environ.get('EGYPTVR_BAKE_SIZE', '2048'))
SAMPLES = int(os.environ.get('EGYPTVR_BAKE_SAMPLES', '24'))

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

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
chunks = []
for part in ('near', 'mid', 'far'):
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
            if bsdf and bsdf.inputs['Alpha'].default_value < .99:
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
    # Make each chunk's materials independent so bake targets never alias.
    for slot in obj.material_slots:
        slot.material = slot.material.copy()
        slot.material['surfaceId'] = material_id(slot.material.name)
        mat = slot.material
        sid = mat['surfaceId']
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        if sid in ('dust', 'plaster', 'linen', 'pottery', 'wood'):
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(str(OUT/f'{sid}-albedo.png'), check_existing=True)
            uv = mat.node_tree.nodes.new('ShaderNodeUVMap')
            uv.uv_map = obj.data.uv_layers[0].name
            mat.node_tree.links.new(uv.outputs['UV'], tex.inputs['Vector'])
            mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    uv0 = obj.data.uv_layers[0]
    for poly in obj.data.polygons:
        sid = obj.data.materials[poly.material_index]['surfaceId']
        if sid not in ('dust', 'plaster', 'linen', 'pottery', 'wood'): continue
        for li in poly.loop_indices:
            v = obj.matrix_world @ obj.data.vertices[obj.data.loops[li].vertex_index].co
            normal = poly.normal
            if abs(normal.z) > .65: u, w = v.x, v.y
            elif abs(normal.x) > abs(normal.y): u, w = v.y, v.z
            else: u, w = v.x, v.z
            scale = 2 if sid in ('dust', 'plaster') else .5
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
    # Runtime uses shared external maps; avoid embedding duplicate albedos.
    bake_materials = list(obj.data.materials)
    for slot in obj.material_slots:
        slot.material = slot.material.copy()
        for node in list(slot.material.node_tree.nodes):
            if node.type == 'TEX_IMAGE': slot.material.node_tree.nodes.remove(node)
    obj.data.uv_layers.active_index = 0
    obj.data.uv_layers[0].active_render = True
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'hero_street_corridor_{part}.glb'), export_format='GLB', use_selection=True, export_yup=True, export_extras=True)
    lods = []
    original_triangles = sum(len(p.vertices)-2 for p in obj.data.polygons)
    for level, ratio in ((1,.55),(2,.28)):
        low = obj.copy(); low.data = obj.data.copy()
        scene.collection.objects.link(low)
        low.name = obj.name + f'-lod{level}'
        # Keep lightmap charts disconnected: collapsing across atlas seams
        # samples unrelated irradiance and produces dark checkerboard patches.
        bm=bmesh.new();bm.from_mesh(low.data)
        uv=bm.loops.layers.uv.get('LightmapUV')
        seams=[]
        for edge in bm.edges:
            if len(edge.link_faces)!=2: continue
            if edge.link_faces[0].material_index!=edge.link_faces[1].material_index:
                seams.append(edge);continue
            if uv and any((next(l for l in edge.link_faces[0].loops if l.vert==v)[uv].uv-
                           next(l for l in edge.link_faces[1].loops if l.vert==v)[uv].uv).length>.00001 for v in edge.verts):
                seams.append(edge)
        bmesh.ops.split_edges(bm,edges=seams)
        bm.to_mesh(low.data);bm.free()
        modifier = low.modifiers.new('Measured silhouette LOD', 'DECIMATE')
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.select_all(action='DESELECT'); low.select_set(True)
        bpy.context.view_layer.objects.active = low
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        triangles = sum(len(p.vertices)-2 for p in low.data.polygons)
        filename = f'hero_street_corridor_{part}.lod{level}.glb'
        bpy.ops.export_scene.gltf(filepath=str(OUT/filename), export_format='GLB', use_selection=True, export_yup=True, export_extras=True)
        lods.append({'fileName':filename,'triangles':triangles,'ratio':triangles/original_triangles})
        bpy.data.objects.remove(low, do_unlink=True)
    material_bindings.update({mat.name:mat['surfaceId'] for mat in obj.data.materials})
    for slot, mat in zip(obj.material_slots, bake_materials): slot.material = mat
    bindings.append({'assetId':f'hero-street-corridor-{part}', 'fileName':f'hero_street_corridor_{part}.glb', 'irradiance':f'{part}-irradiance.png', 'uvSet':1, 'triangles':original_triangles,'lods':lods})
    print(f'EXPORTED {part}', flush=True)

manifest = {
  'id':'hero-street-authored-v2', 'units':'meters', 'format':'glTF 2.0',
  'source':'Existing locked project-authored street GLBs; no external media',
  'evidenceLevel':'inferred', 'lightingEvidenceLevel':'speculative',
  'sunDirectionBabylon':[-.62,-.74,.27],
  'bake':{'engine':'Cycles','samples':SAMPLES,'resolution':SIZE,'passes':['sky-diffuse-direct','sky-diffuse-indirect','sun-diffuse-indirect'],'includesAlbedo':False,'includesSunDirect':False,'colorSpace':'linear','uvSet':1},
  'surfaceTextureMeters':2, 'normalConvention':'glTF tangent space',
  'surfaceScaleMeters':{'dust':2,'plaster':2,'linen':.5,'pottery':.5,'wood':.5},
  'surfaceRefinement':{'plasterBevelMeters':.018,'clothFoldMaxMeters':.04,'clothSagMaxMeters':.085,'clothThicknessMeters':.003,'hemHeightMeters':.004,'woodBendMaxMeters':.006,'potteryLipBevelMeters':.004,'potteryBulgeMaxMeters':.018,'objectTransforms':'unchanged'},
  'packing':{'r':'ambient occlusion','g':'roughness','b':'metallic'},
  'assets':bindings, 'materials':material_bindings,
  'lockedInputs': {str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'content/scene-data/hero-street.camera-lock.json', ROOT/'content/scene-data/memphis-white-walls.tour.json']},
  'sourceHashes': {a['fileName']:hashlib.sha256((SOURCE/a['fileName']).read_bytes()).hexdigest() for a in bindings}
}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Editable source includes original placement, UVs, lights and bake targets.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'content/generated/hero-street-bake.blend'))
print('Hero street baking finished.', flush=True)
