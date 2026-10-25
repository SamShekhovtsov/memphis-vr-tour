"""Assert that only the two diagnosed cloth skins were removed, with no moved retained vertices/UVs."""
import json,struct
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
def triangles(file):
 b=file.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=memoryview(b)[28+n:];result=[]
 def read(index):
  a=j['accessors'][index];v=j['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  at=v.get('byteOffset',0)+a.get('byteOffset',0);size=np.dtype(dtype).itemsize
  return np.ndarray((a['count'],width),dtype=dtype,buffer=binary,offset=at,strides=(v.get('byteStride',width*size),size)).copy()
 for m in j['meshes']:
  for p in m['primitives']:
   pos=read(p['attributes']['POSITION']);uv=read(p['attributes']['TEXCOORD_1']);ids=read(p['indices']).reshape(-1,3)
   records=np.concatenate([pos,uv],axis=1)
   for tri in ids:result.append(b''.join(sorted(records[i].tobytes() for i in tri)))
 return sorted(result)
index=json.loads((root/'content/source-assets/image-quality-baseline/index.json').read_text())
vertices=lambda tris:set(triangle[i:i+20] for triangle in tris for i in range(0,len(triangle),20))
for part in ['mid','far']:
 file='apps/web-tour/public/assets/authored/hero-street/hero_street_corridor_'+part+'.glb'
 before=triangles(root/index[file]);after=triangles(root/file)
 assert len(before)-len(after)==(1760 if part=='mid' else 0),(part,len(before),len(after))
 assert vertices(after)<=vertices(before),'Retained positions/UVs changed or new vertices added'
 def frames(file):
  b=file.read_bytes();j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
  return [(n.get('translation'),n.get('rotation'),n.get('scale')) for n in j['nodes']]
 assert frames(root/index[file])==frames(root/file),'Object transforms changed'
 print(f'{part}: {len(before)-len(after)} redundant cloth triangles removed; retained vertex/UV sets and object transforms unchanged')
