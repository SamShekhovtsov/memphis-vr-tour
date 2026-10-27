"""Bounded character-art edits from immutable accepted GLBs; Blender Python."""
import bpy,json,struct,math,sys,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'content/source-assets/character-art-baseline'
INDEX=json.loads((BASE/'index.json').read_text())
FOLDER=ROOT/'apps/web-tour/public/assets/authored/people'
class Glb:
    def __init__(self,path):
        raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
        self.j=json.loads(raw[20:20+n]);self.bin=bytearray(raw[28+n:])
    def array(self,index):
        a=self.j['accessors'][index];v=self.j['bufferViews'][a['bufferView']]
        width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        assert not v.get('byteStride')
        return np.frombuffer(self.bin,dtype={5126:'<f4',5121:'u1',5123:'<u2',5125:'<u4'}[a['componentType']],offset=v.get('byteOffset',0)+a.get('byteOffset',0),count=a['count']*width).reshape(-1,width)
    def primitive(self,name):return next(m for m in self.j['meshes'] if m['name']==name)['primitives'][0]
    def attrs(self,name):return {k:self.array(i) for k,i in self.primitive(name)['attributes'].items()}
    def save(self,path):
        for m in self.j['meshes']:
            for p in m['primitives']:
                a=self.j['accessors'][p['attributes']['POSITION']];v=self.array(p['attributes']['POSITION']);a['min']=v.min(axis=0).tolist();a['max']=v.max(axis=0).tolist()
        j=json.dumps(self.j,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
        path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(self.bin))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(self.bin),0x004e4942)+self.bin)
    def append(self,array,typ,component,normalized=False,target=34962):
        array=np.ascontiguousarray(array);offset=len(self.bin);self.bin=self.bin+array.tobytes();self.bin.extend(b'\0'*(-len(self.bin)%4))
        self.j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':array.nbytes,'target':target})
        a={'bufferView':len(self.j['bufferViews'])-1,'componentType':component,'count':len(array),'type':typ}
        if normalized:a['normalized']=True
        self.j['accessors'].append(a);return len(self.j['accessors'])-1
    def compact(self):
        # Discard unused old garment/index payloads without changing rig/image data.
        referenced={p['indices'] for m in self.j['meshes'] for p in m['primitives']}|{i for m in self.j['meshes'] for p in m['primitives'] for i in p['attributes'].values()}|{s['inverseBindMatrices'] for s in self.j['skins']}
        arrays={i:self.array(i).copy() for i in referenced};old=self.j['accessors'];self.j['accessors']=[];self.j['bufferViews']=[];self.bin=bytearray();mapping={}
        for i in sorted(referenced):
            a=old[i];mapping[i]=self.append(arrays[i],a['type'],a['componentType'],a.get('normalized',False),34963 if a['type']=='SCALAR' else 34962)
        for m in self.j['meshes']:
            for p in m['primitives']:p['indices']=mapping[p['indices']];p['attributes']={k:mapping[v] for k,v in p['attributes'].items()}
        for s in self.j['skins']:s['inverseBindMatrices']=mapping[s['inverseBindMatrices']]
        self.j['buffers'][0]['byteLength']=len(self.bin)
def tree(points):
    kd=KDTree(len(points))
    for i,p in enumerate(points):kd.insert(Vector(p),i)
    kd.balance();return kd
def normals(g,name):
    a=g.attrs(name);p=a['POSITION'];primitive=g.primitive(name);tri=g.array(primitive['indices']).reshape(-1,3)
    n=np.zeros_like(p);cross=np.cross(p[tri[:,1]]-p[tri[:,0]],p[tri[:,2]]-p[tri[:,0]])
    for c in range(3):np.add.at(n,tri[:,c],cross)
    # Weld shading at UV splits, not geometry, joints or material boundaries.
    _,group=np.unique(np.round(p,5),axis=0,return_inverse=True);summed=np.zeros((group.max()+1,3),dtype=np.float32);np.add.at(summed,group,n);n=summed[group]
    lengths=np.linalg.norm(n,axis=1);valid=lengths>1e-10;n[valid]/=lengths[valid,None];n[~valid]=a['NORMAL'][~valid]
    assert np.mean(np.sum(n*a['NORMAL'],axis=1))>.25,'Unexpected face winding'
    a['NORMAL'][:]=n
def linen_bodice(g,body,kd):
    verts=[];faces=[];rows=24;sides=64;lo=1.025;hi=1.30
    for row in range(rows+1):
        t=row/rows;y=lo+(hi-lo)*t
        stops=[(0,.16,.175),(.32,.165,.175),(.62,.19,.195),(1,.18,.14)]
        for left,right in zip(stops,stops[1:]):
            if left[0]<=t<=right[0]:
                u=(t-left[0])/(right[0]-left[0]);u=u*u*(3-2*u);width=left[1]+u*(right[1]-left[1]);front=left[2]+u*(right[2]-left[2]);break
        back=.10-.01*t
        for col in range(sides):
            angle=col*math.tau/sides;fold=.0025*math.sin(angle*12+t)*(.4+.6*(1-t))
            verts.append(((width+fold)*math.copysign(abs(math.cos(angle))**(2/3.5),math.cos(angle)),y,(front if math.sin(angle)>=0 else back)*math.copysign(abs(math.sin(angle))**(2/3.5),math.sin(angle))))
    for r in range(rows):
        for c in range(sides):
            a=r*sides+c;b=r*sides+(c+1)%sides;faces.extend([(a,a+sides,b),(b,a+sides,b+sides)])
    body_tri=g.array(g.primitive('base')['indices']).reshape(-1,3);bvh=BVHTree.FromPolygons([Vector(p) for p in body['POSITION']],body_tri.tolist(),all_triangles=True)
    for sign in [-1,1]:
        start=len(verts);w=5
        for r in range(25):
            t=r/24
            for c in range(w):
                x=sign*.095+(c/(w-1)-.5)*.045;curve=max(0,1-(abs(x)/.18)**3.5)**(1/3.5);z=(.14*(1-t)-.09*t)*curve
                y=hi-.006+.06*math.sin(t*math.pi);hit=bvh.ray_cast(Vector((x,1.395,z)),Vector((0,-1,0)))
                if hit[0] is not None:y=max(y,hit[0].y+.013)
                verts.append((x,y,z))
        for r in range(24):
            for c in range(w-1):
                a=start+r*w+c;faces.extend([(a,a+1,a+w+1),(a,a+w+1,a+w)])
    pos=np.asarray(verts,dtype='<f4');tri=np.asarray(faces,dtype='<u2');n=np.zeros_like(pos);cross=np.cross(pos[tri[:,1]]-pos[tri[:,0]],pos[tri[:,2]]-pos[tri[:,0]])
    for c in range(3):np.add.at(n,tri[:,c],cross)
    n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-9)
    joints=np.zeros((len(pos),4),dtype='<u2');weights=np.zeros((len(pos),4),dtype='<f4')
    for i,p in enumerate(pos):
        values={}
        for _,index,d in kd.find_n(Vector(p),4):
            factor=1/max(float(d),.003)**3
            for joint,weight in zip(body['JOINTS_0'][index],body['WEIGHTS_0'][index]):values[int(joint)]=values.get(int(joint),0)+float(weight)*factor
        chosen=sorted(values.items(),key=lambda v:-v[1])[:4];total=sum(v for _,v in chosen)
        for k,(joint,weight) in enumerate(chosen):joints[i,k]=joint;weights[i,k]=weight/total
    uv=np.stack((np.arctan2(pos[:,0],pos[:,2])*.21/.12,pos[:,1]/.12),axis=1).astype('<f4');color=np.full((len(pos),4),255,dtype='u1')
    color[:,:3]=[249,247,244]
    a={key:g.append(array,typ,ctype,norm) for key,array,typ,ctype,norm in [('POSITION',pos,'VEC3',5126,False),('NORMAL',n,'VEC3',5126,False),('JOINTS_0',joints,'VEC4',5123,False),('WEIGHTS_0',weights,'VEC4',5126,False),('TEXCOORD_0',uv,'VEC2',5126,False),('COLOR_0',color,'VEC4',5121,True)]}
    p=g.primitive('linen-bodice');p['attributes']=a;p['indices']=g.append(tri.reshape(-1,1),'SCALAR',5123,target=34963)
    return {'type':'Lofted linen torso with two shoulder bands; 24x64 tube, 24x4 strap grids','vertices':len(pos),'triangles':len(tri),'necklineY':hi,'hemY':lo}
def reference_body(g,sex):
    clean=Glb(ROOT/f'content/source-assets/characters/character-art-reference-{sex}.glb')
    source=clean.attrs('base');old=g.attrs('base');oldtree=tree(old['POSITION'])
    names={g.j['nodes'][node]['name']:i for i,node in enumerate(g.j['skins'][0]['joints'])}
    source_names=[clean.j['nodes'][node]['name'] for node in clean.j['skins'][0]['joints']]
    mapping=np.array([names[n] for n in source_names],dtype='u1')
    oldinv=g.array(g.j['skins'][0]['inverseBindMatrices'])
    sourceinv=clean.array(clean.j['skins'][0]['inverseBindMatrices'])
    assert np.max(np.abs(sourceinv-oldinv[mapping]))<.00002,'Reference rig bind coordinates changed'
    attributes={k:v.copy() for k,v in source.items() if k in ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0']}
    attributes['JOINTS_0']=mapping[attributes['JOINTS_0']]
    nearest=[oldtree.find(Vector(p))[1] for p in attributes['POSITION']]
    attributes['COLOR_0']=old['COLOR_0'][nearest].copy()
    primitive=g.primitive('base');primitive['attributes']={}
    for key,array in attributes.items():
        typ='VEC3' if key in ['POSITION','NORMAL'] else 'VEC2' if key=='TEXCOORD_0' else 'VEC4'
        primitive['attributes'][key]=g.append(array,typ,5121 if key in ['JOINTS_0','COLOR_0'] else 5126,key=='COLOR_0')
    primitive['indices']=g.append(clean.array(clean.primitive('base')['indices']).copy(),'SCALAR',5123,target=34963)

def clean_hair(g,body):
    # Clip a connected scalp surface at a continuous hairline. Retain the
    # existing cropped style, material and head attachment, without torn facets.
    h=float(body['POSITION'][:,1].max());cut=.955*h;verts=[];ns=[];faces=[]
    triangles=g.array(g.primitive('base')['indices']).reshape(-1,3)
    for tri in triangles:
        polygon=[(body['POSITION'][i].copy(),body['NORMAL'][i].copy()) for i in tri];out=[]
        for current,following in zip(polygon,polygon[1:]+polygon[:1]):
            a,n=current;b,m=following;inside=a[1]>=cut;nextinside=b[1]>=cut
            if inside:out.append((a,n))
            if inside!=nextinside:
                t=(cut-a[1])/(b[1]-a[1]);out.append((a+(b-a)*t,n+(m-n)*t))
        if len(out)<3:continue
        start=len(verts)
        for p,n in out:
            n=n/max(float(np.linalg.norm(n)),1e-9);verts.append(p+n*.003);ns.append(n)
        for k in range(1,len(out)-1):faces.append((start,start+k,start+k+1))
    pos=np.asarray(verts,dtype='<f4');normal=np.asarray(ns,dtype='<f4');indices=np.asarray(faces,dtype='<u2').reshape(-1,1)
    head=next(i for i,node in enumerate(g.j['skins'][0]['joints']) if g.j['nodes'][node]['name']=='head')
    joints=np.zeros((len(pos),4),dtype='u1');joints[:,0]=head;weights=np.zeros((len(pos),4),dtype='<f4');weights[:,0]=1
    uv=pos[:,[0,2]]/.04;color=np.full((len(pos),4),255,dtype='u1');color[:,:3]=246
    arrays={'POSITION':pos,'NORMAL':normal,'JOINTS_0':joints,'WEIGHTS_0':weights,'TEXCOORD_0':uv.astype('<f4'),'COLOR_0':color}
    primitive=g.primitive('cropped-hair');primitive['attributes']={}
    for key,array in arrays.items():
        typ='VEC3' if key in ['POSITION','NORMAL'] else 'VEC2' if key=='TEXCOORD_0' else 'VEC4'
        primitive['attributes'][key]=g.append(array,typ,5121 if key in ['JOINTS_0','COLOR_0'] else 5126,key=='COLOR_0')
    primitive['indices']=g.append(indices,'SCALAR',5123,target=34963)

def main():
    reports=[]
    for sex in ['female','male']:
        path=FOLDER/f'hero_{sex}.glb';g=Glb(ROOT/INDEX[path.relative_to(ROOT).as_posix()])
        if '--step=2' in sys.argv:reference_body(g,sex)
        body=g.attrs('base');points=body['POSITION'];kd=tree(points)
        report={'sex':sex,'meshes':{m['name']:{'vertices':len(g.array(m['primitives'][0]['attributes']['POSITION'])),'bounds':[g.array(m['primitives'][0]['attributes']['POSITION']).min(axis=0).tolist(),g.array(m['primitives'][0]['attributes']['POSITION']).max(axis=0).tolist()]} for m in g.j['meshes']}}
        if sex=='female':
            cloth=g.attrs('linen-bodice');nearest=np.array([kd.find(Vector(p))[1] for p in cloth['POSITION']]);target=body['WEIGHTS_0'][nearest];same=np.all(cloth['JOINTS_0']==body['JOINTS_0'][nearest],axis=1)
            report['bodiceNearestWeightMismatchVertices']=int(np.sum(~same| (np.max(np.abs(cloth['WEIGHTS_0']-target),axis=1)>.01)))
        if '--inspect' not in sys.argv:
            original=points.copy();h=float(points[:,1].max());covered=np.zeros(len(points),dtype=bool)
            wrap=g.attrs('wrapped-linen');lo,hi=wrap['POSITION'][:,1].min(),wrap['POSITION'][:,1].max()
            waist=np.clip((wrap['POSITION'][:,1]-lo)/(hi-lo),0,1)**2
            wrap['POSITION'][:,2]+=np.sign(wrap['POSITION'][:,2]+.005)*.040*waist
            wrap['POSITION'][:,0]+=np.sign(wrap['POSITION'][:,0])*.005*waist
            normals(g,'wrapped-linen')
            # Only deep garment interiors are concealed. Leave neckline, armholes,
            # waist and hem margins as actual skin, never alpha-tested exposed anatomy.
            covered|=(points[:,1]>lo+.065)&(points[:,1]<hi-.055)&(np.abs(points[:,0])<(.19 if sex=='male' else .175))&(np.abs(points[:,2])<.19)
            if sex=='female':
                original_cloth=cloth['POSITION'].copy()
                membership=np.zeros(len(points),dtype=bool)
                # UV splits can duplicate a position. Include all its duplicates in coverage.
                positions={tuple(np.round(points[i],5)) for i in nearest}
                membership[:]=[tuple(np.round(p,5)) in positions for p in points]
                covered|=(membership if '--step=2' not in sys.argv else True)&(points[:,1]>1.065)&(points[:,1]<1.26)&(np.abs(points[:,0])<.175)
            primitive=g.primitive('base');accessor=g.j['accessors'][primitive['indices']];indices=g.array(primitive['indices']);tri=indices.reshape(-1,3).copy();remove=np.all(covered[tri],axis=1)
            safety=ROOT/('content/source-assets/characters/character-art-reference-coverage-safety.json' if '--step=2' in sys.argv else 'content/source-assets/characters/character-art-coverage-safety.json')
            if safety.exists():remove[np.asarray(json.loads(safety.read_text())['unsafeConcealedFaceIds'][sex],dtype=int)]=False
            kept=tri[~remove].reshape(-1,1)
            indices[:len(kept)]=kept;accessor['count']=int(len(kept))
            report['concealedBodyTrianglesRemoved']=int(remove.sum());report['concealedBodyTriangleIds']=np.flatnonzero(remove).tolist()
            assert remove.sum()<len(tri)*.3
            if '--step=2' in sys.argv:
                # Preserve anatomical landmarks; soften only sub-millimetre triangulation
                # noise on cheeks/forehead. No scaling, rig or body-proportion changes.
                neighbors=[set() for _ in points]
                for face in tri:
                    for i in face:neighbors[i].update(int(k) for k in face if k!=i)
                eye=g.attrs('high-poly')['POSITION'];ey=float(eye[:,1].mean())
                # Define facial landmarks using the actual eye centers, rather than a
                # fixed fraction that placed the earlier cheek mask above the eyes.
                skin_color=body['COLOR_0'];rgb=skin_color[:,:3].astype(np.float32)/255
                face=(original[:,1]>.87*h)&(np.abs(original[:,0])<.105)&(original[:,2]>.05)
                x=original[:,0];y=original[:,1];cx=float(np.mean(eye[eye[:,0]>0,0]));front=np.clip((original[:,2]-.065)/.035,0,1)
                brow=np.exp(-((y-(ey+.014*h))/(.0035*h))**2-((np.abs(x)-cx)/(.014*h))**4)*front*.62
                lip=np.exp(-((y-(ey-.038*h))/(.003*h))**2-(x/(.019*h))**6)*front*.45
                lid=np.exp(-((y-(ey+.002*h))/(.0015*h))**2-((np.abs(x)-cx)/(.013*h))**4)*front*.18
                for mask,tint in [(brow,[.23,.18,.14]),(lip,[.70,.54,.49]),(lid,[.40,.33,.29])]:
                    mask=mask*face;rgb=rgb*(1-mask[:,None])+np.asarray(tint)*mask[:,None]
                skin_color[:,:3]=np.uint8(np.clip(rgb,0,1)*255+.5)
                normals(g,'base')
                eyeattrs=g.attrs('high-poly');eye=eyeattrs['POSITION'];colors=eyeattrs['COLOR_0'];colors[:,3]=255
                for sign in [-1,1]:
                    select=eye[:,0]*sign>0;part=eye[select];center=(part.min(axis=0)+part.max(axis=0))*.5
                    radius=np.sqrt((part[:,0]-center[0])**2+(part[:,1]-center[1])**2);front=part[:,2]>center[2]
                    iris=np.clip((.0068-radius)/.0018,0,1)*front;pupil=np.clip((.0034-radius)/.0012,0,1)*front
                    tone=np.tile([.58,.52,.43],(len(part),1));tone=tone*(1-iris[:,None])+np.array([.055,.025,.008])*iris[:,None]
                    tone=tone*(1-pupil[:,None])+np.array([.003,.002,.001])*pupil[:,None]
                    colors[select,:3]=np.uint8(np.clip(tone,0,1)*255+.5)
                eye_material={'name':'hero-eye','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.3},'doubleSided':False}
                g.j['materials'].append(eye_material);g.primitive('high-poly')['material']=len(g.j['materials'])-1
                report['referenceAnatomy']='Connected reduction from original CC0 body; shared rig and bind coordinates retained';report['faceDisplacementMaxMetres']=float(np.linalg.norm(points-original,axis=1).max());report['eyes']='Opaque separate material; muted sclera, brown iris and pupil vertex colours; original eye geometry/UV/skin retained';report['facialDefinition']='Soft brow, upper-lid and lip colour localized from anatomical eye centers; no new textures'
            if sex=='female':report['bodice']=linen_bodice(g,body,kd)
            if '--step=2' in sys.argv:clean_hair(g,body)
            g.compact();g.save(path)
            # Keep an editable native source corresponding to the final exported bytes.
            bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
            bpy.context.preferences.filepaths.save_version=0
            bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'content/source-assets/characters/character-art-{sex}.blend'))
        reports.append(report)
    if '--inspect' not in sys.argv:
        manifest=json.loads((ROOT/INDEX[(FOLDER/'manifest.json').relative_to(ROOT).as_posix()]).read_text())
        for a in manifest['assets']:
            path=FOLDER/a['fileName'];g=Glb(path);a['bytes']=path.stat().st_size;a['triangles']=sum(g.j['accessors'][p['indices']]['count']//3 for m in g.j['meshes'] for p in m['primitives'])
        manifest['characterArt']={'phase':'steps-1-2' if '--step=2' in sys.argv else 'step-1','source':'Accepted CC0 bases; project-authored garment coverage, clearance and reference-pair refinement','rig':'unchanged','textures':'unchanged'}
        (FOLDER/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',newline='\n')
        (ROOT/'content/source-assets/characters/character-art-audit.json').write_text(json.dumps(reports,indent=2)+'\n',newline='\n')
    print(json.dumps([{k:v for k,v in r.items() if k!='concealedBodyTriangleIds'} for r in reports],indent=2),flush=True)

if __name__=='__main__':main()
