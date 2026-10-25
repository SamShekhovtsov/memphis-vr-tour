"""Refine existing linen clearance/weights; retain body, rig, indices and paths.
Original garment streams are kept as a reversible source payload, with hashes.
"""
from pathlib import Path
import json,struct,hashlib,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/web-tour/public/assets/authored/people'
REV=ROOT/'content/scene-data/hero-street.steps56-revision.json'
PAYLOAD=ROOT/'content/source-assets/characters/hero-fit-baseline.bin'
sha=lambda b:hashlib.sha256(b).hexdigest()
revision=json.loads(REV.read_text()) if REV.exists() else {'date':'2026-10-25','scope':'Step 5 static contacts and step 6 existing garment fit; roots, body, cameras and paths fixed','files':{},'avatars':{}}
if REV.exists() and '--refresh' not in sys.argv:raise RuntimeError('Pass --refresh explicitly to regenerate the authored fit')
payload=bytearray(PAYLOAD.read_bytes()) if PAYLOAD.exists() else bytearray()
for sex in ('male','female'):
    file=OUT/f'hero_{sex}.glb';raw=file.read_bytes();size=struct.unpack_from('<I',raw,12)[0]
    j=json.loads(raw[20:20+size]);binary=bytearray(raw[28+size:])
    previous=revision['avatars'].get(sex)
    if previous:
        for stream in previous['streams']:
            start,n,source=stream['offset'],stream['bytes'],stream['beforeOffset']
            binary[start:start+n]=payload[source:source+n]
    mesh_index=next(n['mesh'] for n in j['nodes'] if n.get('name')=='wrapped-linen')
    streams=[]
    for primitive in j['meshes'][mesh_index]['primitives']:
        def array(semantic):
            a=j['accessors'][primitive['attributes'][semantic]];v=j['bufferViews'][a['bufferView']]
            width=3 if semantic in ('POSITION','NORMAL') else 4
            dtype={5121:'u1',5123:'<u2',5126:'<f4'}[a['componentType']]
            assert not v.get('byteStride') and a.get('byteOffset',0)==0
            return np.frombuffer(binary,dtype=dtype,count=a['count']*width,offset=v.get('byteOffset',0)).reshape(-1,width).copy()
        positions=array('POSITION');lo,hi=positions[:,1].min(),positions[:,1].max()
        t=(positions[:,1]-lo)/(hi-lo)
        # Smooth clearance under bent thighs, pinning the waist. Preserve all
        # vertical positions, original lengths, folds and shell thickness.
        slack=(1-t)**.8
        r=np.sqrt(positions[:,0]**2+(positions[:,2]+.005)**2)
        positions[:,0]+=positions[:,0]/np.maximum(r,.02)*(.032*slack+.004)
        positions[:,2]+=(positions[:,2]+.005)/np.maximum(r,.02)*(.065*slack+.005)
        skin=j['skins'][0];names=[j['nodes'][n]['name'] for n in skin['joints']]
        joints=array('JOINTS_0');weights=array('WEIGHTS_0')
        joints[:]=[names.index(n) for n in ('root','upperleg01.L','upperleg01.R','spine05')]
        fade=np.clip((t-.6)/.4,0,1);fade=fade*fade*(3-2*fade)
        leg=.78*(1-fade)
        left=.5+.5*np.tanh(positions[:,0]/.025)
        spine=.85*t**4
        weights[:,0]=1-leg-spine;weights[:,1]=leg*left;weights[:,2]=leg*(1-left);weights[:,3]=spine
        # The long female wrap reaches below the knee. Preserve four slots,
        # but blend upper/lower-leg joints there instead of dragging its hem
        # with the pelvis. Both sides retain a narrow continuous centre fold.
        a=j['accessors'][skin['inverseBindMatrices']];v=j['bufferViews'][a['bufferView']]
        inv=np.frombuffer(binary,dtype='<f4',count=a['count']*16,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,4,4).transpose(0,2,1)
        knee=np.linalg.inv(inv[names.index('lowerleg01.L')])[1,3]
        lower=positions[:,1]<knee+.10
        blend=np.clip((knee+.08-positions[:,1])/.16,0,1);blend=blend*blend*(3-2*blend)
        joints[lower]=[names.index(n) for n in ('upperleg01.L','upperleg01.R','lowerleg01.L','lowerleg01.R')]
        weights[lower,0]=left[lower]*(1-blend[lower]);weights[lower,1]=(1-left[lower])*(1-blend[lower])
        weights[lower,2]=left[lower]*blend[lower];weights[lower,3]=(1-left[lower])*blend[lower]
        a=j['accessors'][primitive['indices']];v=j['bufferViews'][a['bufferView']]
        indices=np.frombuffer(binary,dtype='<u2' if a['componentType']==5123 else '<u4',count=a['count'],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,3)
        normals=np.zeros_like(positions)
        vectors=np.cross(positions[indices[:,1]]-positions[indices[:,0]],positions[indices[:,2]]-positions[indices[:,0]])
        for axis in range(3):np.add.at(normals,indices[:,axis],vectors)
        lengths=np.linalg.norm(normals,axis=1)
        normals/=np.maximum(lengths[:,None],1e-10)
        for semantic,data in [('POSITION',positions),('NORMAL',normals),('JOINTS_0',joints),('WEIGHTS_0',weights)]:
            index=primitive['attributes'][semantic];a=j['accessors'][index];v=j['bufferViews'][a['bufferView']]
            start=v.get('byteOffset',0);n=v['byteLength'];assert len(data.tobytes())==n
            if previous:
                old=next(s for s in previous['streams'] if s['accessor']==index);source=old['beforeOffset']
            else:
                source=len(payload);payload.extend(binary[start:start+n])
            binary[start:start+n]=data.tobytes()
            if semantic=='POSITION':a['min']=data.min(axis=0).tolist();a['max']=data.max(axis=0).tolist()
            streams.append({'accessor':index,'semantic':semantic,'mesh':mesh_index,'offset':start,'bytes':n,'beforeOffset':source,'afterSha':sha(data.tobytes()),'accessorAfter':a})
    revision['avatars'][sex]={'streams':streams,'materialTailSha':sha(binary[json.loads((ROOT/'content/scene-data/hero-people.material-lock.json').read_text())['avatars'][sex]['binaryBytes']:])}
    encoded=json.dumps(j,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
    result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    file.write_bytes(result)
    print(sex,'fit refined with unchanged body/rig/index streams:',len(result),'bytes')
if not PAYLOAD.exists():PAYLOAD.write_bytes(payload)
else:assert PAYLOAD.read_bytes()==payload
revision['baselinePayload']={'file':str(PAYLOAD.relative_to(ROOT)).replace('\\','/'),'sha256':sha(payload)}
revision['fitRecipe']={'sideClearanceMaxMeters':.036,'frontBackClearanceMaxMeters':.070,'upperWrapLegInfluenceMax':.78,'kneeHemLegInfluenceMax':1.0,'waistSpineInfluenceMax':.85,'longHem':'smooth upper/lower-leg blend','verticalPositions':'unchanged','rootAndRig':'unchanged'}
REV.write_text(json.dumps(revision,indent=2)+'\n')
manifest=json.loads((OUT/'manifest.json').read_text())
for asset in manifest['assets']:asset['bytes']=(OUT/asset['fileName']).stat().st_size
manifest['garmentFit']=revision['fitRecipe']
manifest['materialRefinement']['skinCoverage']='Legacy QA fallback only; fitted garments use opaque skin'
manifest['materialRefinement']['engineBindings']['vertexColour']='linear RGB multiply; fitted skin is opaque, legacy coverage alpha may be ignored'
manifest['materialRefinement']['engineBindings']['skin']['alphaMode']='OPAQUE'
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
