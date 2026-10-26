"""Check exported LOD bind compatibility before sharing live-hero pose textures."""
import json,struct,hashlib,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'apps/web-tour/public/assets/authored/people'
def load(path):
    b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0]
    return json.loads(b[20:20+n]),b[28+n:]
def array(j,b,index):
    a=j['accessors'][index];v=j['bufferViews'][a['bufferView']]
    size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    dtype={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
    return np.frombuffer(b,dtype=dtype,offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*size).reshape(a['count'],size)
def binds(j,b):
    s=j['skins'][0];m=array(j,b,s['inverseBindMatrices'])
    return {j['nodes'][n]['name']:m[i] for i,n in enumerate(s['joints'])}
manifest=json.loads((folder/'crowd/manifest.json').read_text());results=[]
for item in manifest['assets']:
    source=folder/f"hero_{item['sex']}.glb";target=ROOT/item['file']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==item['sourceSha256']
    assert hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']
    j,b=load(source);k,c=load(target);a,d=binds(j,b),binds(k,c)
    assert set(a)==set(d),'Lost named skeletal joints'
    error=max(float(np.max(np.abs(a[name]-d[name]))) for name in a)
    assert error<.0001,('Incompatible inverse bind matrices',error)
    assert item['afterTriangles']<item['beforeTriangles']*.45
    assert len(j['meshes'])==len(k['meshes'])
    for mesh in k['meshes']:
        for p in mesh['primitives']:
            assert all(s in p['attributes'] for s in ['POSITION','NORMAL','TEXCOORD_0','COLOR_0','JOINTS_0','WEIGHTS_0'])
            assert np.all(np.isfinite(array(k,c,p['attributes']['POSITION'])))
            weights=array(k,c,p['attributes']['WEIGHTS_0'])
            if 'WEIGHTS_1' in p['attributes']:weights=np.concatenate([weights,array(k,c,p['attributes']['WEIGHTS_1'])],axis=1)
            assert np.max(np.abs(weights.sum(axis=1)-1))<.001
    results.append(dict(file=item['file'],bindError=error,triangles=item['afterTriangles'],attributesPreserved=True))
(ROOT/'docs/design/crowd-lod-audit.json').write_text(json.dumps(results,indent=2)+'\n')
print('Four skinned crowd LODs passed bind, joint, UV, colour, weight and geometry checks')
