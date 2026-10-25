"""Project-authored skin/cropped-hair/linen detail on the existing rigged meshes.

Appends only opaque vertex colours and missing UVs. The original GLB binary,
nodes, skins, animations, indices and existing attributes are retained exactly.
"""
from pathlib import Path
import hashlib
import json
import math
import struct
import sys
import subprocess
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'content/generated/people-materials-before'
OUT = ROOT/'apps/web-tour/public/assets/authored/people'
N = 512

def noise(cells, seed):
    grid = np.random.default_rng(seed).random((cells,cells))
    xy = np.arange(N)*cells/N
    i = xy.astype(int); f = xy-i; f = f*f*(3-2*f)
    a,b = grid[i[:,None]%cells,i[None,:]%cells],grid[i[:,None]%cells,(i[None,:]+1)%cells]
    c,d = grid[(i[:,None]+1)%cells,i[None,:]%cells],grid[(i[:,None]+1)%cells,(i[None,:]+1)%cells]
    return (a*(1-f[None,:])+b*f[None,:])*(1-f[:,None])+(c*(1-f[None,:])+d*f[None,:])*f[:,None]

def save(name, rgb):
    pixels=np.uint8(np.clip(rgb,0,1)*255+.5)
    image=Image.fromarray(pixels,'RGB')
    image.save(OUT/(name+'.png'))
    image.save(OUT/(name+'.webp'),lossless=True,method=6)
    with Image.open(OUT/(name+'.webp')) as decoded:
        assert decoded.convert('RGB').tobytes()==image.tobytes()

for kind in ('skin','hair','linen'):
    broad,fine = noise(7,64),noise(110,65)
    y,x=np.mgrid[0:N,0:N]/N
    if kind=='skin':
        # A restrained generic pore tile; anatomical tone lives in COLOR_0.
        h=.000035*noise(150,71)-.000045*np.maximum(noise(95,72)-.58,0)
        tone=(broad-.5)*.013+(fine-.5)*.006
        rgb=np.array([.648,.502,.409])[None,None,:]+tone[:,:,None]
        rough=.64+(broad-.5)*.10+(fine-.5)*.06
        metres=.12
    elif kind=='hair':
        # Short clumps and fine directional strand breakup, not painted shine.
        clump=noise(35,76)
        h=.00024*clump+.000035*np.sin((x*95+.35*np.sin(y*math.tau*7))*math.tau)
        tone=(clump-.5)*.045+(fine-.5)*.012
        rgb=np.array([.18,.14,.105])[None,None,:]+tone[:,:,None]
        rough=.53+(clump-.5)*.15
        metres=.04
    else:
        warp=np.sin((x*96+.18*np.sin(y*math.tau*5))*math.tau)
        weft=np.sin((y*86+.12*np.sin(x*math.tau*7))*math.tau)
        h=.000055*(warp+weft)+.000015*(fine-.5)
        tone=(broad-.5)*.035+(fine-.5)*.009+(warp+weft)*.002
        rgb=np.array([.855,.815,.735])[None,None,:]+tone[:,:,None]
        rough=.94+(fine-.5)*.045
        metres=.12
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))/(2*metres/N)
    dy=(np.roll(h,-1,0)-np.roll(h,1,0))/(2*metres/N)
    normal=np.stack((-dx,-dy,np.ones_like(dx)),axis=2)
    normal/=np.linalg.norm(normal,axis=2)[:,:,None]
    save(kind+'-albedo',rgb)
    save(kind+'-normal',normal*.5+.5)
    save(kind+'-orm',np.stack((np.ones_like(x),rough,np.zeros_like(x)),axis=2))

def read_accessor(j,b,index):
    a=j['accessors'][index];v=j['bufferViews'][a['bufferView']]
    width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    item=np.dtype(dtype).itemsize
    return np.ndarray((a['count'],width),dtype=dtype,buffer=b,
        offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',item*width),item)).copy()

for sex in ('male','female'):
    baseline=BASE/f'hero_{sex}.glb'
    use_baseline=baseline.exists() and '--from-current' not in sys.argv
    source=(baseline if use_baseline else OUT/f'hero_{sex}.glb').read_bytes()
    length=struct.unpack_from('<I',source,12)[0]
    j=json.loads(source[20:20+length]);binary=bytearray(source[28+length:])
    if not use_baseline:
        # Rebuild from a fresh checkout without depending on ignored archives.
        # The lock stores the original schema and original binary prefix hash.
        lock=json.loads((ROOT/'content/scene-data/hero-people.material-lock.json').read_text())['avatars'][sex]
        fit_path=ROOT/'content/scene-data/hero-street.steps56-revision.json'
        if fit_path.exists():
            fit=json.loads(fit_path.read_text())
            raw_fit=(ROOT/fit['baselinePayload']['file']).read_bytes()
            for stream in fit['avatars'][sex]['streams']:
                start,n,offset=stream['offset'],stream['bytes'],stream['beforeOffset']
                binary[start:start+n]=raw_fit[offset:offset+n]
        assert hashlib.sha256(binary[:lock['binaryBytes']]).hexdigest()==lock['binarySha']
        binary=binary[:lock['binaryBytes']]
        j['accessors'],j['bufferViews']=lock['accessors'],lock['bufferViews']
        for mesh,primitives in zip(j['meshes'],lock['primitives']):mesh['primitives']=primitives
    def append(array,typ,component,normalized=False):
        data=array.tobytes();offset=len(binary);binary.extend(data);binary.extend(b'\0'*(-len(data)%4))
        j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(data),'target':34962})
        a={'bufferView':len(j['bufferViews'])-1,'componentType':component,'count':len(array),'type':typ}
        if normalized:a['normalized']=True
        j['accessors'].append(a)
        return len(j['accessors'])-1
    for mesh in j['meshes']:
        for p in mesh['primitives']:
            pos=read_accessor(j,binary,p['attributes']['POSITION']);height=1.78645 if sex=='male' else 1.5929
            sid=j['materials'][p['material']]['name']
            if 'TEXCOORD_0' not in p['attributes']:
                if sid=='hero-hair':uv=pos[:,[0,2]]/.04
                else:
                    # The single wrap seam is at the back; fine repeat detail
                    # averages there. No split vertices or weight edits.
                    u=np.arctan2(pos[:,0],pos[:,2]+.005)*.21/.12
                    uv=np.stack((u,pos[:,1]/.12),axis=1)
                p['attributes']['TEXCOORD_0']=append(uv.astype('<f4'),'VEC2',5126)
            t=pos[:,1]/height
            colour=np.ones((len(pos),4),dtype=np.float32)
            if sid=='hero-skin':
                # Subtle anatomical variation, not directional painted light.
                colour[:,:3]=[.94,.91,.88]
                cheek=np.exp(-((t-.95)/.014)**2-((np.abs(pos[:,0])-.032)/.025)**2)*np.clip((pos[:,2]-.08)/.06,0,1)
                ear=np.exp(-((t-.958)/.022)**2)*np.clip((np.abs(pos[:,0])-.058)/.02,0,1)
                joint=np.exp(-((t-.29)/.035)**2)+.5*np.exp(-((t-.58)/.035)**2)
                colour[:,1]-=.055*cheek+.07*ear+.02*joint
                colour[:,2]-=.04*cheek+.08*ear+.03*joint
                # Low-amplitude pigment variation follows the skin as it bends.
                variation=.012*np.sin(pos[:,0]*41+pos[:,1]*11)*np.sin(pos[:,2]*33)
                colour[:,:3]+=variation[:,None]
                # Covered torso/upper-thigh skin stays hidden beneath linen.
                # Exclude the arms/hands in the original A-pose and leave a
                # generous margin inside both waist and hem boundaries.
                covered=(t>(.40 if sex=='male' else .30)) & (t<(.55 if sex=='male' else .66)) & (np.abs(pos[:,0])<.245)
                colour[covered,3]=0
            elif sid=='hero-linen':
                lo,hi=pos[:,1].min(),pos[:,1].max()
                hem=np.exp(-((pos[:,1]-lo)/.025)**2)
                crease=.5+.5*np.sin(np.arctan2(pos[:,0],pos[:,2]+.005)*15)
                colour[:,:3]-=hem[:,None]*np.array([.10,.12,.15])[None,:]
                colour[:,:3]-=crease[:,None]*np.array([.012,.014,.017])[None,:]
            else:
                tone=.96+.025*np.sin(pos[:,0]*85+pos[:,2]*71)
                colour[:,:3]=tone[:,None]
            p['attributes']['COLOR_0']=append(np.uint8(np.clip(colour,0,1)*255+.5),'VEC4',5121,True)
    j['buffers'][0]['byteLength']=len(binary)
    encoded=json.dumps(j,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
    result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))
    result+=struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    (OUT/f'hero_{sex}.glb').write_bytes(result)
    print(sex,'appended material attributes; original binary retained:',len(source),'to',len(result))
manifest=json.loads(((BASE/'manifest.json') if (BASE/'manifest.json').exists() else OUT/'manifest.json').read_text())
for asset in manifest['assets']:asset['bytes']=(OUT/asset['fileName']).stat().st_size
maps={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in OUT.glob('*.webp')}
manifest['materialRefinement']={'id':'hero-people-materials-v1','date':'2026-10-25','source':'Project-authored procedural PBR maps and bind-pose tone masks; no external media',
    'geometryChanged':False,'skinDetailUvRepeat':16,'maps':maps,'normalConvention':'glTF tangent space','skinCoverage':'binary bind-pose vertex alpha, clipped at 0.5; covered torso/upper thighs only', 'packing':{'r':'unused white AO','g':'roughness','b':'metallic zero'},
    'browserTiers':{'balanced':{'ormMaps':False,'extraFiberLobes':False,'roughness':{'skin':.64,'hair':.53,'linen':.94}},'cinematic':{'ormMaps':True,'extraFiberLobes':True}},
    'engineBindings':{'baseColorFactor':[1,1,1,1],'vertexColour':'linear RGB multiply; skin alpha clip, hair/linen opaque','albedoColorSpace':'sRGB','normalAndOrmColorSpace':'linear',
        'skin':{'uvSet':0,'repeat':16,'normalStrength':.32,'dielectricF0Factor':.75},
        'hair':{'uvSet':0,'repeat':1,'normalStrength':.65,'dielectricF0Factor':.9,'anisotropy':.25},
        'linen':{'uvSet':0,'repeat':1,'normalStrength':.35,'dielectricF0Factor':.9,'sheenIntensity':.18,'sheenRoughness':.88}}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if (ROOT/'content/scene-data/hero-street.steps56-revision.json').exists():
    subprocess.run([sys.executable,str(ROOT/'tools/fit-hero-clothing.py'),'--refresh'],check=True)
