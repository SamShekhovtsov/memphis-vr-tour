"""Deterministic, project-authored PBR surfaces; never changes character geometry.

Albedo is sRGB; normal/ORM data are linear. Scalar fields contain pigment or
roughness, never directional baked lighting. Shared anatomical unwrap is read
from the accepted male reference. Exact PNG sources and lossless WebP delivery.
"""
from pathlib import Path
import json,struct,hashlib,math
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/web-tour/public/assets/authored/people/surfaces-v2'
SRC=ROOT/'content/source-assets/characters/surfaces-v2'
OUT.mkdir(parents=True,exist_ok=True);SRC.mkdir(parents=True,exist_ok=True)
N=512
y,x=np.mgrid[:N,:N]/N
def noise(cells,seed):
    a=np.random.default_rng(seed).random((cells,cells));q=np.arange(N)*cells/N;i=q.astype(int);t=q-i;t=t*t*(3-2*t)
    return ((a[i[:,None]%cells,i[None,:]%cells]*(1-t[None,:])+a[i[:,None]%cells,(i[None,:]+1)%cells]*t[None,:])*(1-t[:,None])+(a[(i[:,None]+1)%cells,i[None,:]%cells]*(1-t[None,:])+a[(i[:,None]+1)%cells,(i[None,:]+1)%cells]*t[None,:])*t[:,None])
def normal(h,metres):
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))/(2*metres/N);dy=(np.roll(h,-1,0)-np.roll(h,1,0))/(2*metres/N)
    n=np.stack((-dx,-dy,np.ones_like(dx)),2);n/=np.linalg.norm(n,axis=2)[:,:,None];return n*.5+.5
records={}
def save(name,rgb):
    image=Image.fromarray(np.uint8(np.clip(rgb,0,1)*255+.5),'RGB');image.save(SRC/(name+'.png'));image.save(OUT/(name+'.webp'),lossless=True,method=6)
    decoded=Image.open(OUT/(name+'.webp')).convert('RGB');assert decoded.tobytes()==image.tobytes()
    b=(OUT/(name+'.webp')).read_bytes();records[name+'.webp']={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'width':N,'height':N,'colorSpace':'sRGB' if name.endswith('albedo') else 'linear'}

# Anatomical pigment field evaluated in the original bind pose and rasterized
# to UV0. No mesh edits, extra vertex attributes, runtime overlays or samplers.
raw=(ROOT/'apps/web-tour/public/assets/authored/people/hero_male.glb').read_bytes();l=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+l]);b=raw[28+l:]
def array(i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
    return np.frombuffer(b,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*w).reshape(-1,w)
p=next(m for m in g['meshes'] if m['name']=='base')['primitives'][0];pos=array(p['attributes']['POSITION']);uv=array(p['attributes']['TEXCOORD_0']);tri=array(p['indices']).reshape(-1,3);h=pos[:,1].max()
def pigment(p):
    px,py,pz=p[...,0],p[...,1],p[...,2];t=py/h;front=np.clip((pz-.045)/.065,0,1)
    # Warm cheek/ear/lip tissue, subtle joint pigment and palms/soles. No AO.
    cheek=np.exp(-((t-.935)/.018)**2-((abs(px)-.035)/.027)**2)*front
    ear=np.exp(-((t-.95)/.022)**2)*np.clip((abs(px)-.064)/.022,0,1)
    lip=np.exp(-((t-.916)/.006)**2-(px/.032)**6)*front
    joint=np.exp(-((t-.285)/.025)**2)*np.clip((pz+.02)/.08,0,1)+.35*np.exp(-((t-.59)/.025)**2)*np.clip((abs(px)-.15)/.1,0,1)
    extremity=np.exp(-((t-.08)/.06)**2)*.25+np.exp(-((t-.42)/.06)**2)*np.clip((abs(px)-.22)/.08,0,1)*.18
    variation=.007*np.sin(px*27+py*13)*np.sin(pz*31-py*7)
    color=np.broadcast_to([.658,.511,.419],p.shape).copy()+variation[...,None]
    color+=cheek[...,None]*[.024,-.014,-.012]+ear[...,None]*[.027,-.015,-.018]+lip[...,None]*[-.015,-.029,-.019]
    color-=joint[...,None]*[.018,.025,.027];color+=extremity[...,None]*[.065,.062,.049]
    rough=.63-.085*front*np.exp(-((t-.95)/.055)**2)+.025*joint
    return color,rough
atlas=np.zeros((N,N,3));roughness=np.zeros((N,N));mask=np.zeros((N,N),bool)
for face in tri:
    coords=uv[face]*N;lo=np.maximum(np.floor(coords.min(0)).astype(int),0);hi=np.minimum(np.ceil(coords.max(0)).astype(int),N-1)
    if np.any(hi<lo):continue
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5);a,c,d=coords
    den=(c[1]-d[1])*(a[0]-d[0])+(d[0]-c[0])*(a[1]-d[1])
    if abs(den)<1e-9:continue
    u=((c[1]-d[1])*(xx-d[0])+(d[0]-c[0])*(yy-d[1]))/den;v=((d[1]-a[1])*(xx-d[0])+(a[0]-d[0])*(yy-d[1]))/den;w=1-u-v;inside=(u>=-1e-6)&(v>=-1e-6)&(w>=-1e-6)
    pts=u[...,None]*pos[face[0]]+v[...,None]*pos[face[1]]+w[...,None]*pos[face[2]];rgb,r= pigment(pts)
    sl=np.s_[lo[1]:hi[1]+1,lo[0]:hi[0]+1];atlas[sl][inside]=rgb[inside];roughness[sl][inside]=r[inside];mask[sl]|=inside
# Dilate island padding 16px so lower mips do not sample a black background.
for _ in range(16):
    old=mask.copy()
    for axis,direction in [(0,1),(0,-1),(1,1),(1,-1)]:
        neighbor=np.roll(old,direction,axis);fill=(~mask)&neighbor;atlas[fill]=np.roll(atlas,direction,axis)[fill];roughness[fill]=np.roll(roughness,direction,axis)[fill];mask[fill]=True
atlas[~mask]=[.658,.511,.419];roughness[~mask]=.63
save('skin-albedo',atlas);save('skin-orm',np.stack((np.ones_like(x),roughness,np.zeros_like(x)),2))
pores=noise(150,41);skin_height=.000013*(pores-.5)-.000010*np.maximum(noise(100,42)-.62,0)
save('skin-normal',normal(skin_height,.12))

# Hair is an opaque cropped scalp, not transparent hair cards. A crown field
# follows existing planar scalp UVs once rather than repeating a noisy tile.
angle=np.arctan2(y-.53,x-.48);radius=np.hypot(x-.48,y-.53)
strand=np.sin(angle*94+radius*52+noise(12,48)*.9);clumps=noise(28,49);fine=noise(110,50)
hair_height=.000027*strand+.000055*(clumps-.5)
rgb=np.array([.118,.087,.063])[None,None,:]+((clumps-.5)*.028+strand*.004+(fine-.5)*.006)[...,None]
save('hair-albedo',rgb);save('hair-normal',normal(hair_height,.22));save('hair-orm',np.stack((np.ones_like(x),.66+(clumps-.5)*.10,np.zeros_like(x)),2))

# Finer, low-contrast plain weave; broad pigment variation is separate from
# micro-relief. No baked stripes pretending to be folds or directional light.
warp=np.sin(x*math.tau*72+.10*np.sin(y*math.tau*3));weft=np.sin(y*math.tau*68+.12*np.sin(x*math.tau*4))
broad=noise(5,53);fine=noise(100,54);height=.000018*(warp+weft)+.000008*(fine-.5)
rgb=np.array([.875,.849,.791])[None,None,:]+((broad-.5)*.025+(fine-.5)*.006+(warp+weft)*.001)[...,None]
save('linen-albedo',rgb);save('linen-normal',normal(height,.12));save('linen-orm',np.stack((np.ones_like(x),.91+(broad-.5)*.055+(fine-.5)*.025,np.zeros_like(x)),2))
manifest={'id':'character-surfaces-v2','source':'Project-authored deterministic PBR; accepted CC0 anatomical UVs','geometryChanged':False,'atlasSourceSha256':hashlib.sha256(raw).hexdigest(),'maps':records,'uv':{'skinAlbedoOrm':1,'skinNormal':16,'hairScale':.18,'hairOffset':.5,'linen':1},'packing':{'r':'unused AO white','g':'linear roughness','b':'metallic zero'},'normalConvention':'OpenGL/glTF tangent space','sourceScript':'tools/build-character-surfaces.py',
    'engineBindings':{'baseColorFactor':[1,1,1,1],'vertexColor':'existing linear RGB multiply; opaque','skin':{'normalStrength':.22,'balancedRoughness':.63,'dielectricF0Factor':.72},'hair':{'normalStrength':.40,'balancedRoughness':.66,'dielectricF0Factor':.85,'cinematicAnisotropy':.16},'linen':{'normalStrength':.22,'balancedRoughness':.91,'dielectricF0Factor':.85,'cinematicSheen':.12,'sheenRoughness':.92,'sheenColor':[.91,.87,.78]},'cinematicRoughness':'ORM green multiplied by1; balanced uses scalar roughness','normalImport':'Calibrate tangent convention per engine; Babylon flips normalX in left-handed scenes and normalY in right-handed scenes'}}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',newline='\n')
print('Surface maps:',sum(r['bytes'] for r in records.values()),'bytes; nine shared maps, unchanged geometry')
