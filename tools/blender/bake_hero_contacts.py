"""Bake short-range static visibility into the EXISTING irradiance UV charts.
No geometry, UV, transform, camera or runtime file is changed by this tool.
"""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'content/generated/steps56-ao'
OUT.mkdir(parents=True,exist_ok=True)
blend=ROOT/'content/generated/hero-street-bake.blend'
if blend.exists():
    bpy.ops.wm.open_mainfile(filepath=str(blend))
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for part in ('near','mid','far'):
        bpy.ops.import_scene.gltf(filepath=str(ROOT/f'apps/web-tour/public/assets/authored/hero-street/hero_street_corridor_{part}.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=4
scene.cycles.use_denoising=True
scene.render.bake.margin=4
scene.render.bake.use_clear=True
for part in ('near','mid','far'):
    obj=bpy.data.objects['hero-street-'+part+'-baked']
    image=bpy.data.images.new(part+'-short-contact',1024,1024,alpha=False,float_buffer=False)
    image.colorspace_settings.name='Non-Color'
    # Emission bake transports a ray-traced AO value, not surface radiance.
    mat=bpy.data.materials.new(part+'-contact-data');mat.use_nodes=True
    nodes=mat.node_tree.nodes;nodes.clear()
    ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.4;ao.samples=8
    emission=nodes.new('ShaderNodeEmission');output=nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(ao.outputs['AO'],emission.inputs['Color'])
    mat.node_tree.links.new(emission.outputs['Emission'],output.inputs['Surface'])
    target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
    for slot in obj.material_slots:slot.material=mat
    obj.data.uv_layers.active_index=1
    obj.data.uv_layers[1].active_render=True
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    print('BAKING existing UV1 contact visibility:',part,flush=True)
    bpy.ops.object.bake(type='EMIT',uv_layer=obj.data.uv_layers[1].name)
    image.filepath_raw=str(OUT/(part+'-contact-ao.png'));image.file_format='PNG';image.save()
print('Static contact bake finished; runtime assets untouched.',flush=True)
