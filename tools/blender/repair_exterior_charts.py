"""Repair reversed exterior end-wall UV charts throughout the existing street using an outward sampling shell.
The shell is bake-only: runtime geometry, transforms and collision surfaces stay unchanged.
"""
import bpy,bmesh,json,sys
bpy.context.preferences.filepaths.save_version=0
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'content/source-assets/lighting/exterior-repair';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'content/source-assets/street-finish/steps78-finished.blend'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.render.bake.margin=4;scene.render.bake.use_clear=True
scene.render.bake.use_pass_color=False;scene.render.bake.use_pass_indirect=True
profile=json.loads((ROOT/'content/scene-data/hero-street.finish-lighting.json').read_text())['bake']
background=scene.world.node_tree.nodes['Background'];background.inputs['Color'].default_value=(*profile['skyColor'],1)
sun=next(o for o in scene.objects if o.type=='LIGHT' and o.data.type=='SUN');sun.data.energy=profile['sunBounceEnergy']
houses=json.loads((ROOT/'content/scene-data/district-navigation.json').read_text())['houses']
def exterior_end(p):
 return any(abs(p.y-(-h['maxZ']-(h['maxZ']-h['minZ'])*.005))<.075 and -h['maxX']-16.5-.08<p.x<-h['minX']-16.5+.08 for h in houses)
records={}
for part in ['near','mid','far']:
 source=bpy.data.objects['hero-street-'+part+'-baked']
 # The softened inset panels were wound inward; reverse only the temple-facing exterior panel faces.
 fix=bmesh.new();fix.from_mesh(source.data);fixed=0
 for face in fix.faces:
  p=source.matrix_world@face.calc_center_median();sid=source.data.materials[face.material_index].get('surfaceId')
  if exterior_end(p) and p.z>.12 and face.normal.y>.8 and sid in ['plaster','hero-plaster']:face.normal_flip();fixed+=1
 fix.normal_update();fix.to_mesh(source.data);fix.free();source.data.update()
 shell=source.copy();shell.data=source.data.copy();scene.collection.objects.link(shell);shell.name=part+'-exterior-sampling-shell'
 bm=bmesh.new();bm.from_mesh(shell.data);uv=bm.loops.layers.uv.get('LightmapUV');keep=[];triangles=[]
 for face in bm.faces:
  p=source.matrix_world@face.calc_center_median();normal=source.matrix_world.to_3x3()@face.normal
  sid=source.data.materials[face.material_index].get('surfaceId')
  if exterior_end(p) and p.z>.12 and normal.y<-.8 and sid in ['plaster','hero-plaster']:
   keep.append(face);points=[[float(l[uv].uv.x),float(l[uv].uv.y)] for l in face.loops];triangles.append(points)
 if not keep:
  bm.free();bpy.data.objects.remove(shell,do_unlink=True);continue
 chosen=set(keep);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f not in chosen],context='FACES')
 for v in bm.verts:v.co.y-=.04
 bm.to_mesh(shell.data);bm.free();shell.data.update()
 image=bpy.data.images.new(part+'-exterior-irradiance',2048,2048,alpha=True,float_buffer=True);image.colorspace_settings.name='Non-Color'
 # Independent receiver materials prevent the target image leaking to old meshes.
 for slot in shell.material_slots:
  slot.material=slot.material.copy();node=slot.material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;slot.material.node_tree.nodes.active=node
 bpy.ops.object.select_all(action='DESELECT');shell.select_set(True);bpy.context.view_layer.objects.active=shell
 uvname=shell.data.uv_layers.get('LightmapUV').name;channels={}
 for label,strength,direct in [('sky',profile['skyStrength'],True),('bounce',0,False)]:
  sun.hide_render=label=='sky';background.inputs['Strength'].default_value=strength;scene.render.bake.use_pass_direct=direct
  print('EXTERIOR BAKE',part,label,len(keep),flush=True);bpy.ops.object.bake(type='DIFFUSE',uv_layer=uvname)
  values=np.empty(2048*2048*4,dtype=np.float32);image.pixels.foreach_get(values);channels[label]=values.reshape((2048,2048,4))[:,:,:3].copy()
 np.savez_compressed(OUT/(part+'-repair.npz'),**channels)
 records[part]={'reversedPanelFaces':fixed,'faces':len(keep),'sampleOffsetMeters':.04,'uvPolygons':triangles}
 bpy.data.objects.remove(shell,do_unlink=True)
(OUT/'manifest.json').write_text(json.dumps({'samples':48,'resolution':2048,'method':'bake-only outward shell, original UV charts, sky and sun bounce only','runtimeGeometryChanged':False,'parts':records},indent=2)+'\n')
# Export the corrected chunks and genuine LODs; existing positions/UVs stay fixed.
sys.path.insert(0,str(Path(__file__).resolve().parent))
from export_hero_chunk import export_chunk
bindings=[];materials={}
for part in records:
 binding,mapping=export_chunk(OUT,scene,part,bpy.data.objects['hero-street-'+part+'-baked']);bindings.append(binding);materials.update(mapping)
record=json.loads((OUT/'manifest.json').read_text());record['replacementBindings']=bindings;record['replacementMaterials']=materials;record['runtimeGeometryChanged']=False;record['normalsCorrected']=True
(OUT/'manifest.json').write_text(json.dumps(record,indent=2)+'\n')
background.inputs['Strength'].default_value=profile['skyStrength'];sun.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'exterior-corrected.blend'),compress=True)
print('Focused exterior bake complete',flush=True)
