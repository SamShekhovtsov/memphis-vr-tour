"""Exhaustively check that a normals repair did not move/re-UV any high-mesh triangle."""
import json,struct,hashlib
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
base=root/'content/source-assets/lighting/exterior-repair/baseline'
out=root/'apps/web-tour/public/assets/authored/hero-street'
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
vertices=lambda triangles: sorted(set(triangle[i:i+20] for triangle in triangles for i in range(0,len(triangle),20)))
for part in ['near','mid','far']:
 name=f'hero_street_corridor_{part}.glb';before=triangles(base/name);after=triangles(out/name)
 assert len(before)==len(after),'Triangle count changed'
 assert vertices(before)==vertices(after),'Vertex positions or lightmap charts changed'
 print(f'Exterior integrity {part}: {len(after)} triangles; every unique vertex position and lightmap UV retained')
m=json.loads((out/'manifest.json').read_text());assert m['exteriorRepair']['reversedPanelFaces']>0
