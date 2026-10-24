"""Export the authored high mesh and real seam-preserving LODs."""
import bpy
import bmesh
from pack_hero_colours import pack_colours

def export_chunk(OUT, scene, part, obj):
    material_bindings = {}
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    # The two finish families share all runtime channels. Collapse duplicate
    # source slots so chalk/earthen variants do not create redundant draws.
    families = {}
    remap = {}
    for index, material in enumerate(obj.data.materials):
        sid = material.get('surfaceId')
        if sid in ('hero-plaster','hero-linen'):
            remap[index] = families.setdefault(sid,index)
    for polygon in obj.data.polygons:
        polygon.material_index = remap.get(polygon.material_index,polygon.material_index)
    # Runtime uses shared external maps; avoid embedding duplicate albedos.
    bake_materials = list(obj.data.materials)
    for slot in obj.material_slots:
        slot.material = slot.material.copy()
        for node in list(slot.material.node_tree.nodes):
            if node.type == 'TEX_IMAGE': slot.material.node_tree.nodes.remove(node)
    obj.data.uv_layers.active_index = 0
    obj.data.uv_layers[0].active_render = True
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'hero_street_corridor_{part}.glb'), export_format='GLB', use_selection=True, export_yup=True, export_extras=True)
    pack_colours(OUT/f'hero_street_corridor_{part}.glb')
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
        pack_colours(OUT/filename)
        lods.append({'fileName':filename,'triangles':triangles,'ratio':triangles/original_triangles})
        bpy.data.objects.remove(low, do_unlink=True)
    material_bindings.update({mat.name:mat['surfaceId'] for mat in obj.data.materials})
    for slot, mat in zip(obj.material_slots, bake_materials): slot.material = mat
    binding = {'assetId':f'hero-street-corridor-{part}', 'fileName':f'hero_street_corridor_{part}.glb', 'irradiance':f'{part}-irradiance.png', 'uvSet':1, 'triangles':original_triangles,'lods':lods}
    return binding, material_bindings

