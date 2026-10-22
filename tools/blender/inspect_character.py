import bpy, json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'content/source-assets/characters/male.glb'))
data=[]
for o in bpy.context.scene.objects:
    data.append({'name':o.name,'type':o.type,'location':list(o.location),'scale':list(o.scale),'dimensions':list(o.dimensions),
      'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local),'parent':b.parent.name if b.parent else None} for b in o.data.bones} if o.type=='ARMATURE' else None})
(root/'tmp/character-inspection.json').write_text(json.dumps(data,indent=2))
