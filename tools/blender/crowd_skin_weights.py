"""Bound four-influence GPU LOD skinning against eight-influence poses.
Keeps vertex positions, normals, UVs, colours and indices byte-identical.
"""
import json,struct,numpy as np
def bound_skin_weights(path):
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    j=json.loads(data[20:20+length]);binary=bytearray(data[28+length:])
    def array(index):
        a=j['accessors'][index];v=j['bufferViews'][a['bufferView']]
        size={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        assert not v.get('byteStride'),'Review interleaved crowd export'
        return np.frombuffer(binary,dtype={5126:'<f4',5121:'u1',5123:'<u2',5125:'<u4'}[a['componentType']],offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*size).reshape(-1,size)
    skin=j['skins'][0];joints=skin['joints'];inverse=array(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1).copy();world=np.linalg.inv(inverse)
    parents={child:parent for parent,node in enumerate(j['nodes']) for child in node.get('children',[])}
    indices={node:i for i,node in enumerate(joints)}
    def poses(phase):
        memo={}
        def matrix(i):
            if i in memo:return memo[i]
            node=joints[i];parent=indices.get(parents.get(node));name=j['nodes'][node].get('name','')
            angle=(.8 if 'lowerleg01' in name else .4 if 'upperleg01' in name else .9 if 'lowerarm01' in name else .35 if 'upperarm01' in name else 0)*np.sin(phase+(np.pi if name.endswith('.R') else 0))
            c,s=np.cos(angle),np.sin(angle);r=np.array([[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]])
            result=(matrix(parent)@np.linalg.inv(world[parent])@world[i] if parent is not None else world[i])@r
            memo[i]=result;return result
        return np.array([matrix(i)@inverse[i] for i in range(len(joints))])
    pose_matrices=[poses(p) for p in np.linspace(0,2*np.pi,16,endpoint=False)]
    results=[]
    for mesh in j['meshes']:
        for primitive in mesh['primitives']:
            a=primitive['attributes']
            if 'WEIGHTS_1' not in a:continue
            w0=array(a['WEIGHTS_0']);w1=array(a['WEIGHTS_1']);i0=array(a['JOINTS_0']);i1=array(a['JOINTS_1']);positions=array(a['POSITION'])
            assert np.all(w0.min(axis=1)+1e-6>=w1.max(axis=1)),'Exporter must order influences by weight'
            weights=np.concatenate([w0,w1],axis=1).copy();ids=np.concatenate([i0,i1],axis=1);new=w0.copy()/w0.sum(axis=1,keepdims=True)
            points=np.concatenate([positions,np.ones((len(positions),1))],axis=1);errors=[]
            for m in pose_matrices:
                full=sum(np.einsum('nij,nj->ni',m[ids[:,k]],points)*weights[:,k,None] for k in range(weights.shape[1]))
                limited=sum(np.einsum('nij,nj->ni',m[i0[:,k]],points)*new[:,k,None] for k in range(4))
                errors.extend(np.linalg.norm(full[:,:3]-limited[:,:3],axis=1))
            p99=float(np.percentile(errors,99));maximum=float(max(errors))
            # At 8 / 20 m these are subpixel for almost all vertices. Large outliers
            # retain eight influences rather than silently distorting the character.
            accepted=mesh['name']=='base' and p99<.001 and maximum<.005
            results.append(dict(mesh=mesh['name'],p99ErrorMetres=p99,maxErrorMetres=maximum,fourInfluences=accepted))
            if accepted:
                w0[:]=new;del a['WEIGHTS_1'];del a['JOINTS_1']
    text=json.dumps(j,separators=(',',':')).encode();text+=b' '*((-len(text))%4);binary+=b'\0'*((-len(binary))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary)
    return results
