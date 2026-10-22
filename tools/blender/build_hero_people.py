"""Adapt CC0 MakeHuman-derived rigs without changing district/root placements."""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'apps/web-tour/public/assets/authored/people'
OUT.mkdir(parents=True,exist_ok=True)

def material(name,color,roughness):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=roughness
    return m

records=[]
for sex in ('male','female'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=ROOT/f'content/source-assets/characters/{sex}.glb'
    bpy.ops.import_scene.gltf(filepath=str(source))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
    skin=material('hero-skin',(.30,.145,.078),.76)
    linen=material('hero-linen',(.64,.58,.45),.93)
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH': continue
        o.data.materials.clear(); o.data.materials.append(skin)
        for p in o.data.polygons: p.material_index=0; p.use_smooth=True
    # Keep the licensed skin weights. Reduce dense source topology offline.
    bpy.context.view_layer.objects.active=body
    mod=body.modifiers.new('Browser anatomy budget','DECIMATE'); mod.ratio=.24
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # Clothing is project-authored; nearest-surface weights follow the same rig.
    kd=KDTree(len(body.data.vertices))
    for v in body.data.vertices: kd.insert(v.co,v.index)
    kd.balance()
    def clothe(name,verts,faces):
        mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
        obj=bpy.data.objects.new(name,mesh); bpy.context.scene.collection.objects.link(obj)
        obj.parent=rig; obj.data.materials.append(linen)
        for group in body.vertex_groups: obj.vertex_groups.new(name=group.name)
        for v in mesh.vertices:
            _,index,_=kd.find(v.co)
            for g in body.data.vertices[index].groups:
                obj.vertex_groups[g.group].add([v.index],g.weight,'REPLACE')
        arm=obj.modifiers.new('Follow human rig','ARMATURE'); arm.object=rig
        solid=obj.modifiers.new('Linen thickness','SOLIDIFY'); solid.thickness=.003
        for p in mesh.polygons:p.use_smooth=True
        return obj
    h=body.dimensions.z
    # Wrapped linen, with restrained vertical folds and a folded overlap.
    rings=18; sides=64; verts=[]; faces=[]
    bottom=.18*h if sex=='female' else .31*h
    top=.70*h if sex=='female' else .57*h
    for row in range(rings+1):
        t=row/rings; z=bottom+(top-bottom)*t
        if sex=='female':
            width=.205 + .025*math.sin(t*math.pi) - .045*math.exp(-((t-.78)/.13)**2)
            depth=.135 + .012*math.sin(t*math.pi)
        else:
            width=.235-.035*t; depth=.15-.015*t
        for col in range(sides):
            angle=2*math.pi*col/sides
            folds=.007*math.sin(angle*15+1.5*t)*(1-.65*t)
            overlap=.006*math.exp(-(math.sin(angle+.3)/.08)**2)
            verts.append(((width+folds+overlap)*math.cos(angle), (depth+folds)*math.sin(angle)-.005,z))
    for row in range(rings):
        for col in range(sides):
            a=row*sides+col;b=row*sides+(col+1)%sides
            faces.append((a,b,b+sides,a+sides))
    clothe('wrapped-linen',verts,faces)
    if sex=='female':
        # Upper bodice and shoulder coverage follow the anatomical mesh exactly.
        chosen=[p for p in body.data.polygons if .66*h < p.center.z < .84*h and abs(p.center.x)<.25]
        used=sorted({i for p in chosen for i in p.vertices}); remap={v:i for i,v in enumerate(used)}
        clothe('linen-bodice',[body.data.vertices[i].co+body.data.vertices[i].normal*.009 for i in used],
               [tuple(remap[i] for i in p.vertices) for p in chosen])
    # A cropped hair cap is derived from the scalp and remains head-weighted.
    hair=material('hero-hair',(.018,.011,.008),.87)
    chosen=[p for p in body.data.polygons if p.center.z>.955*h]
    used=sorted({i for p in chosen for i in p.vertices}); remap={v:i for i,v in enumerate(used)}
    cap=clothe('cropped-hair',[body.data.vertices[i].co+body.data.vertices[i].normal*.003 for i in used],
               [tuple(remap[i] for i in p.vertices) for p in chosen])
    cap.data.materials.clear();cap.data.materials.append(hair)
    bpy.ops.object.select_all(action='SELECT')
    filename=f'hero_{sex}.glb'
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
    triangles=sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)
    records.append({'id':sex,'fileName':filename,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                    'triangles':triangles,'bones':len(rig.data.bones),'bytes':(OUT/filename).stat().st_size,'license':'CC0-1.0'})
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'content/generated/hero-{sex}.blend'))
(OUT/'manifest.json').write_text(json.dumps({'id':'hero-people-v1','assets':records},indent=2)+'\n')
print(json.dumps(records),flush=True)
