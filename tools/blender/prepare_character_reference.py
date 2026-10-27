"""Reduce welded CC0 anatomy, retaining a connected surface and its original rig."""
import bpy,bmesh,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];records=[]
for sex in ['female','male']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/f'content/source-assets/characters/{sex}.glb'),merge_vertices=True)
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
 for obj in list(bpy.context.scene.objects):
  if obj.type=='MESH' and obj!=body:bpy.data.objects.remove(obj,do_unlink=True)
 bpy.context.view_layer.objects.active=body
 bm=bmesh.new();bm.from_mesh(body.data);before=len(bm.verts);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bm.to_mesh(body.data);bm.free()
 welded=len(body.data.vertices)
 mod=body.modifiers.new('Connected anatomical reduction','DECIMATE');mod.ratio=.24;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 # Recompute connected smooth normals; inherited split normals can be stale
 # after reduction. UV seams remain loop attributes, not disconnected skin.
 if body.data.has_custom_normals:
  bpy.ops.mesh.customdata_custom_splitnormals_clear()
 for p in body.data.polygons:p.use_smooth=True
 mat=bpy.data.materials.new('anatomy-reference');mat.use_nodes=True;body.data.materials.clear();body.data.materials.append(mat)
 body.name='base';body.data.name='base'
 for p in body.data.polygons:p.material_index=0
 bpy.ops.object.select_all(action='SELECT')
 target=ROOT/f'content/source-assets/characters/character-art-reference-{sex}.glb'
 bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True,export_animations=False,export_extras=True,export_all_influences=False)
 bm=bmesh.new();bm.from_mesh(body.data);boundary=sum(e.is_boundary for e in bm.edges);bm.free()
 records.append({'sex':sex,'verticesBeforeWeld':before,'verticesAfterWeld':welded,'reducedVertices':len(body.data.vertices),'triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'boundaryEdges':boundary,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256((ROOT/f'content/source-assets/characters/{sex}.glb').read_bytes()).hexdigest()})
(ROOT/'content/source-assets/characters/character-art-reference-topology.json').write_text(json.dumps(records,indent=2)+'\n',newline='\n');print(json.dumps(records),flush=True)
