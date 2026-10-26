"""Derive skin/UV/colour-preserving crowd LODs from the current licensed runtime people.
Original close-view assets and their editable sources are never modified.
"""
import bpy,json,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).resolve().parent))
from crowd_skin_weights import bound_skin_weights
folder=ROOT/'apps/web-tour/public/assets/authored/people'
out=folder/'crowd';out.mkdir(exist_ok=True)
records=[]
for sex in ['female','male']:
    for level,ratio in [(1,.28),(2,.06)]:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        source=folder/f'hero_{sex}.glb'
        bpy.ops.import_scene.gltf(filepath=str(source))
        before=after=0
        for obj in list(bpy.context.scene.objects):
            if obj.type!='MESH':continue
            before+=sum(len(p.vertices)-2 for p in obj.data.polygons)
            # Eyes and small clothing details remain intact; geometry stays skinned.
            if len(obj.data.polygons)>600:
                bpy.context.view_layer.objects.active=obj
                mod=obj.modifiers.new('Crowd screen-size LOD','DECIMATE');mod.ratio=ratio
                mod.use_collapse_triangulate=True
                bpy.ops.object.modifier_apply(modifier=mod.name)
            after+=sum(len(p.vertices)-2 for p in obj.data.polygons)
        bpy.ops.object.select_all(action='SELECT')
        target=out/f'hero_{sex}_lod{level}.glb'
        bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True,export_animations=False,export_extras=True,export_all_influences=True)
        weights=bound_skin_weights(target)
        blend=ROOT/f'content/source-assets/characters/crowd-{sex}-lod{level}.blend'
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        records.append(dict(sex=sex,level=level,ratio=ratio,skinWeightAudit=weights,beforeTriangles=before,afterTriangles=after,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),file=target.relative_to(ROOT).as_posix(),blend=blend.relative_to(ROOT).as_posix()))
(out/'manifest.json').write_text(json.dumps(dict(license='Derived from existing CC0 anatomy and project-authored surfaces; see characters/PROVENANCE.md',assets=records),indent=2)+'\n')
print(json.dumps(records),flush=True)
