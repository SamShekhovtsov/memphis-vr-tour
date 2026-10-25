"""Retire two redundant cloth skins. Retained vertices, UVs, transforms and lights stay fixed."""
import bpy,bmesh,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'content/source-assets/image-quality';OUT.mkdir(exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'content/source-assets/lighting/exterior-repair/exterior-corrected.blend'))
sys.path.insert(0,str(Path(__file__).resolve().parent))
from export_hero_chunk import export_chunk
records={};bindings=[];materials={}
for part in ['mid']:
 obj=bpy.data.objects['hero-street-'+part+'-baked'];bm=bmesh.new();bm.from_mesh(obj.data)
 pending={v for f in bm.faces if obj.data.materials[f.material_index].get('surfaceId') in ['linen','hero-linen'] for v in f.verts};matches=[]
 while pending:
  seed=pending.pop();group={seed};todo=[seed]
  while todo:
   for edge in todo.pop().link_edges:
    for vertex in edge.verts:
     if vertex in pending:pending.remove(vertex);group.add(vertex);todo.append(vertex)
  points=[obj.matrix_world@v.co for v in group];lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
  if (abs((hi[1]+lo[1])/2+3.5)<.01 or abs((hi[1]+lo[1])/2-15.5)<.01) and 8.3<hi[0]-lo[0]<8.5:matches.append((group,lo,hi))
 assert len(matches)==2,(part,'Expected exactly two diagnosed duplicates',len(matches))
 group=set().union(*(m[0] for m in matches));faces={f for v in group for f in v.link_faces};assert all(set(f.verts)<=group for f in faces)
 records[part]={'removedVertices':len(group),'removedTriangles':sum(len(f.verts)-2 for f in faces),'bounds':[[m[1],m[2]] for m in matches],'retainedVerticesMoved':0,'retainedUvsChanged':False,'reason':'Retire older upper skins crossing the retained hero cloth panels'}
 bmesh.ops.delete(bm,geom=list(group),context='VERTS');bm.normal_update();bm.to_mesh(obj.data);bm.free();obj.data.update()
 binding,mapping=export_chunk(OUT,bpy.context.scene,part,obj);bindings.append(binding);materials.update(mapping)
manifest=json.loads((ROOT/'apps/web-tour/public/assets/authored/hero-street/manifest.json').read_text())
manifest['assets']=[next((b for b in bindings if b['assetId']==a['assetId']),a) for a in manifest['assets']];manifest['materials'].update(materials)
manifest['imageQualityGeometry']={'removedDuplicateClothSkins':2,'buildingsMoved':False,'collisionChanged':False,'existingIndirectBakeRetained':True,'directShadows':'updated from corrected geometry in real time','parts':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cloth-corrected.blend'),compress=True)
print(json.dumps(records),flush=True)
