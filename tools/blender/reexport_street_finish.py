"""Exporter-only repair; reuse finished geometry, UVs, bake and LOD policy."""
import bpy,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.context.preferences.filepaths.save_version=0
sys.path.insert(0,str(Path(__file__).resolve().parent))
from export_hero_chunk import export_chunk
OUT=ROOT/'content/generated/steps78-build'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'content/source-assets/street-finish/steps78-finished.blend'))
manifest=json.loads((OUT/'manifest.json').read_text());bindings=[];materials={}
for part in ('near','mid','far'):
 obj=bpy.data.objects['hero-street-'+part+'-baked'];obj.data.color_attributes.render_color_index=obj.data.color_attributes.find('HeroFinish')
 binding,mapping=export_chunk(OUT,bpy.context.scene,part,obj);bindings.append(binding);materials.update(mapping)
manifest['assets']=bindings;manifest['materials']=materials
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

profile=json.loads((ROOT/'content/scene-data/hero-street.finish-lighting.json').read_text())
bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=profile['bake']['skyStrength']
# Losslessly ZIP-compress the editable 32-bit linear EXRs; verify samples.
import numpy as np
scene=bpy.context.scene
scene.render.image_settings.file_format='OPEN_EXR';scene.render.image_settings.color_depth='32';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.exr_codec='ZIP'
previous_view=scene.view_settings.view_transform;scene.view_settings.view_transform='Raw'
for file in sorted((ROOT/'content/source-assets/lighting/steps78-bake').glob('*.exr')):
 image=bpy.data.images.load(str(file),check_existing=False);image.colorspace_settings.name='Non-Color'
 values=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(values)
 image.save_render(str(file),scene=scene)
 check=bpy.data.images.load(str(file),check_existing=False);check.colorspace_settings.name='Non-Color'
 decoded=np.empty(len(check.pixels),dtype=np.float32);check.pixels.foreach_get(decoded)
 assert np.array_equal(values,decoded),'EXR sample changed during ZIP compression'
 bpy.data.images.remove(image);bpy.data.images.remove(check)
scene.view_settings.view_transform=previous_view
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'content/source-assets/street-finish/steps78-finished.blend'),compress=True)
