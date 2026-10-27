"""Geometric stress audit of concealed-face coverage; never changes assets."""
import sys,json,math
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from character_art_pass import Glb,ROOT,FOLDER,INDEX
audit=json.loads((ROOT/'content/source-assets/characters/character-art-audit.json').read_text());results=[];unsafe={}
for sex in ['female','male']:
 g=Glb(FOLDER/f'hero_{sex}.glb');original=Glb(ROOT/INDEX[(FOLDER/f'hero_{sex}.glb').relative_to(ROOT).as_posix()]);skin=g.j['skins'][0];inv=g.array(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);bind=np.linalg.inv(inv)
 ids={node:i for i,node in enumerate(skin['joints'])};parents={child:ids.get(node) for node in skin['joints'] for child in g.j['nodes'][node].get('children',[])}
 removed=np.asarray(next(r for r in audit if r['sex']==sex)['concealedBodyTriangleIds']);tri=original.array(original.primitive('base')['indices']).reshape(-1,3)[removed]
 unsafe[sex]=set()
 for pose in ['neutral','stride-left','stride-right','bent-knees','reach','lift','torso-turn']:
  memo={}
  def world(i):
   if i in memo:return memo[i]
   name=g.j['nodes'][skin['joints'][i]]['name'];parent=parents.get(skin['joints'][i]);angle=0;axis='x'
   if pose.startswith('stride'):
    if 'upperleg01' in name:angle=(.32 if name.endswith('.L') else -.32)*(1 if pose.endswith('left') else -1)
    if 'lowerleg01' in name:angle=.4
   if pose=='bent-knees' and 'lowerleg01' in name:angle=.65
   if pose in ['reach','lift'] and 'upperarm01' in name:angle=.4 if pose=='reach' else .8
   if pose in ['reach','lift'] and 'lowerarm01' in name:angle=.55
   if pose=='torso-turn' and 'spine01'==name:axis='y';angle=.18
   c,s=math.cos(angle),math.sin(angle);r=np.eye(4);r[:3,:3]=[[1,0,0],[0,c,-s],[0,s,c]] if axis=='x' else [[c,0,s],[0,1,0],[-s,0,c]]
   value=(world(parent)@np.linalg.inv(bind[parent])@bind[i] if parent is not None else bind[i])@r;memo[i]=value;return value
  matrices=np.asarray([world(i)@inv[i] for i in range(len(bind))])
  def deform(name):
   a=g.attrs(name);p=np.concatenate((a['POSITION'],np.ones((len(a['POSITION']),1))),axis=1);out=np.zeros((len(p),3))
   for k in range(4):out+=np.einsum('nij,nj->ni',matrices[a['JOINTS_0'][:,k]],p)[:,:3]*a['WEIGHTS_0'][:,k,None]
   return out
  body=deform('base');centers=body[tri].mean(axis=1);norm=np.cross(body[tri[:,1]]-body[tri[:,0]],body[tri[:,2]]-body[tri[:,0]]);norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-9)
  vertices=[];faces=[]
  for name in ['wrapped-linen']+(['linen-bodice'] if sex=='female' else []):
   points=deform(name);face=g.array(g.primitive(name)['indices']).reshape(-1,3)+len(vertices);vertices.extend(Vector(p) for p in points);faces.extend(face.tolist())
  cloth=BVHTree.FromPolygons(vertices,faces,all_triangles=True);misses=0
  for faceId,center,n in zip(removed,centers,norm):
   hit=cloth.ray_cast(Vector(center),Vector(n),.65)
   if hit[0] is None:misses+=1;unsafe[sex].add(int(faceId))
  results.append({'sex':sex,'pose':pose,'concealedFaces':len(tri),'outwardRayMisses':misses,'coveragePercent':100*(1-misses/len(tri))})
(ROOT/'content/source-assets/characters/character-art-pose-audit.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))

if '--derive-safety' in sys.argv:
 path=ROOT/'content/source-assets/characters/character-art-coverage-safety.json'
 assert not path.exists(),'Do not silently overwrite accepted coverage safety'
 path.write_text(json.dumps({'scope':'Conservatively retain skin not covered along its outward normal in the seven documented stress poses','unsafeConcealedFaceIds':{s:sorted(v) for s,v in unsafe.items()}},indent=2)+'\n')
else:
 assert all(r['outwardRayMisses']==0 for r in results),'Uncovered concealed skin in accepted stress poses'
