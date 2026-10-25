"""Finish existing unrefined surfaces, then bake the current whole street.
Input is the immutable pre-pass Blender snapshot; no placement/UV unwrap occurs.
High and seam-preserving low GLBs export to a staging directory, never runtime.
"""
import bpy,bmesh,math,json,sys,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.context.preferences.filepaths.save_version=0
sys.path.insert(0,str(Path(__file__).resolve().parent))
from export_hero_chunk import export_chunk
PROFILE=json.loads((ROOT/'content/scene-data/hero-street.finish-lighting.json').read_text())
BASE=ROOT/'content/source-assets/street-finish/steps78-base.blend'
OUT=ROOT/'content/generated/steps78-build'
SOURCE=ROOT/'content/source-assets/lighting/steps78-bake'
for d in (BASE.parent,OUT,SOURCE):d.mkdir(parents=True,exist_ok=True)
if BASE.exists():bpy.ops.wm.open_mainfile(filepath=str(BASE))
else:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'content/generated/hero-street-bake.blend'))
 bpy.ops.wm.save_as_mainfile(filepath=str(BASE),compress=True)
manifest=json.loads((BASE.parent/'base-manifest.json').read_text())
scene=bpy.context.scene
objects=[(part,bpy.data.objects['hero-street-'+part+'-baked']) for part in ('near','mid','far')]
assert sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for part,obj in objects)==sum(a['triangles'] for a in manifest['assets']), 'Editable Blender input differs from accepted geometry'
records={}
for part,obj in objects:
 bm=bmesh.new();bm.from_mesh(obj.data);bm.normal_update()
 ids={i:m['surfaceId'] for i,m in enumerate(obj.data.materials)}
 colour=bm.loops.layers.float_color.get('HeroFinish')
 assert colour is not None,'Existing finish colours missing'
 def old(p):return 10.5<=p.y<=19.2
 def wall(f):
  p=obj.matrix_world@f.calc_center_median()
  return ids[f.material_index]=='plaster' and not old(p) and abs(f.normal.x)>.94 and (-15.1<p.x<-14.2 or -6.4<p.x<-5.4)
 faces=[f for f in bm.faces if wall(f)]
 original=set(bm.verts);edges={e for f in faces for e in f.edges};bm.edges.index_update()
 if edges:bmesh.ops.subdivide_edges(bm,edges=sorted(edges,key=lambda e:e.index),cuts=1,use_grid_fill=True)
 bm.normal_update();moved=0
 for v in bm.verts:
  p=obj.matrix_world@v.co
  if v in original or v.is_boundary or old(p) or abs(v.normal.x)<.94:continue
  if not all(ids[f.material_index]=='plaster' for f in v.link_faces):continue
  if not (-15.1<p.x<-14.2 or -6.4<p.x<-5.4):continue
  depth=.0035*(1+math.sin(p.y*4.1+math.sin(p.z*5.3)))
  v.co-=v.normal*depth;moved+=1
 variants={m['surfaceId']:i for i,m in enumerate(obj.data.materials) if m['surfaceId'] in ('hero-plaster','hero-linen')}
 for sid in ('plaster','linen'):
  target='hero-'+sid
  if target not in variants:
   source=next(m for m in obj.data.materials if m['surfaceId']==sid)
   mat=source.copy();mat.name='hero-finish-'+sid+'-rollout';mat['surfaceId']=target;obj.data.materials.append(mat);variants[target]=len(obj.data.materials)-1
 changed=0
 for f in bm.faces:
  p=obj.matrix_world@f.calc_center_median();sid=ids[f.material_index]
  if old(p):continue
  is_wall=wall(f)
  if is_wall or sid=='linen':f.material_index=variants['hero-plaster' if is_wall else 'hero-linen'];changed+=1
  if sid not in ('plaster','pottery','wood','linen'):continue
  for l in f.loops:
   q=obj.matrix_world@l.vert.co
   if sid=='plaster' and is_wall:
    variation=.025*math.sin(q.y*1.7+math.sin(q.z*2.7))*math.sin(q.z*3.4+q.y*.7)
    base=math.exp(-max(0,q.z)/.30)
    rgb=(1+variation-.10*base,.985+variation-.14*base,.95+variation-.18*base)
   elif sid in ('wood','pottery'):
    variation=.035*math.sin(q.z*21+q.y*2.1)+.025*math.sin(q.x*11)
    rgb=(1+variation,.98+variation,.95+variation)
   else:continue
   l[colour]=(*[max(0,min(1,c)) for c in rgb],1)
 bm.normal_update();bm.to_mesh(obj.data);bm.free();obj.data.update()
 records[part]={'newInteriorPlasterVertices':moved,'upgradedFaces':changed,'originalBoundariesPreserved':True}
scene.render.engine='CYCLES';scene.cycles.samples=PROFILE['bake']['samples'];scene.cycles.max_bounces=4
scene.render.bake.margin=4;scene.render.bake.use_clear=True
scene.render.bake.use_pass_color=False;scene.render.bake.use_pass_indirect=True
scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value=(*PROFILE['bake']['skyColor'],1)
sun=next(o for o in scene.objects if o.type=='LIGHT' and o.data.type=='SUN')
sun.data.energy=PROFILE['bake']['sunBounceEnergy'];sun.data.color=PROFILE['bake']['sunColor']
# Keep the accepted sun direction, scene transforms and UV1 charts.
bindings=[];materials={};size=PROFILE['bake']['resolution']
for part,obj in objects:
 uv=next(u for u in obj.data.uv_layers if u.name=='LightmapUV')
 obj.data.uv_layers.active_index=list(obj.data.uv_layers).index(uv);uv.active_render=True
 im=bpy.data.images.new(part+'-final-indirect',size,size,alpha=False,float_buffer=True);im.colorspace_settings.name='Non-Color'
 for mat in obj.data.materials:
  node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;mat.node_tree.nodes.active=node
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 channels={}
 for label,sky,direct in [('sky',PROFILE['bake']['skyStrength'],True),('bounce',0,False)]:
  sun.hide_render=(label=='sky');background.inputs['Strength'].default_value=sky;scene.render.bake.use_pass_direct=direct
  print('BAKING finished street',part,label,size,scene.cycles.samples,flush=True)
  bpy.ops.object.bake(type='DIFFUSE',uv_layer=uv.name)
  values=np.empty(size*size*4,dtype=np.float32);im.pixels.foreach_get(values);channels[label]=values.reshape((size,size,4))[:,:,:3].copy()
  im.filepath_raw=str(SOURCE/(part+'-'+label+'.exr'));im.file_format='OPEN_EXR';im.save()
 # Recompute short-range static AO in the same charts, excluding all movers.
 slots=list(obj.data.materials)
 ao_mat=bpy.data.materials.new(part+'-final-contact');ao_mat.use_nodes=True;n=ao_mat.node_tree.nodes;n.clear()
 ao=n.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=PROFILE['bake']['contactDistance'];ao.samples=8
 emit=n.new('ShaderNodeEmission');output=n.new('ShaderNodeOutputMaterial');ao_mat.node_tree.links.new(ao.outputs['AO'],emit.inputs['Color']);ao_mat.node_tree.links.new(emit.outputs['Emission'],output.inputs['Surface'])
 ao_im=bpy.data.images.new(part+'-final-contact',1024,1024,alpha=False,float_buffer=True);ao_im.colorspace_settings.name='Non-Color'
 target=n.new('ShaderNodeTexImage');target.image=ao_im;n.active=target
 for slot in obj.material_slots:slot.material=ao_mat
 scene.cycles.samples=4;bpy.ops.object.bake(type='EMIT',uv_layer=uv.name);scene.cycles.samples=PROFILE['bake']['samples']
 values=np.empty(1024*1024*4,dtype=np.float32);ao_im.pixels.foreach_get(values);channels['ao']=values.reshape((1024,1024,4))[:,:,0].copy()
 for slot,mat in zip(obj.material_slots,slots):slot.material=mat
 np.savez_compressed(OUT/(part+'-linear.npz'),**channels)
 obj.data.color_attributes.render_color_index=obj.data.color_attributes.find('HeroFinish')
 binding,mapping=export_chunk(OUT,scene,part,obj);bindings.append(binding);materials.update(mapping)
 print('EXPORTED finished geometry and LODs',part,flush=True)
manifest['assets']=bindings;manifest['materials']=materials
manifest['finishedStreet']={'profile':PROFILE['id'],'geometry':records,'existingUvChartsPreserved':True,'newObjects':False,'movingPeopleBaked':False,'linearSources':str(SOURCE.relative_to(ROOT)).replace('\\','/')}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(SOURCE/'rollout.json').write_text(json.dumps(records,indent=2)+'\n')
background.inputs['Strength'].default_value=PROFILE['bake']['skyStrength']
sun.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'content/source-assets/street-finish/steps78-finished.blend'),compress=True)
print('Finished street staging complete; runtime unchanged',flush=True)
