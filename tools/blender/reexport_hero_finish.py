"""Re-export the saved bake after explicitly selecting its glTF colour layer.

Useful for exporter-only fixes: does not regenerate geometry or irradiance.
"""
import bpy
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).resolve().parent))
from export_hero_chunk import export_chunk
OUT = ROOT/'apps/web-tour/public/assets/authored/hero-street'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'content/generated/hero-street-bake.blend'))
manifest = json.loads((OUT/'manifest.json').read_text())
bindings, materials = [], {}
for part in ('near','mid','far'):
    obj = bpy.data.objects['hero-street-'+part+'-baked']
    obj.data.color_attributes.render_color_index = obj.data.color_attributes.find('HeroFinish')
    assert obj.data.color_attributes.render_color_index >= 0
    binding, mapping = export_chunk(OUT,bpy.context.scene,part,obj)
    bindings.append(binding)
    materials.update(mapping)
manifest['assets'], manifest['materials'] = bindings, materials
manifest['surfaceScaleMeters'].update({'hero-plaster':2,'hero-linen':.5})
manifest['foregroundFinish'].update({'vertexColour':'opaque normalized RGBA8 COLOR_0, white outside finish region', 'canopyAdditionalSagMaxMeters':.24, 'awningAdditionalSagMaxMeters':.12})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
