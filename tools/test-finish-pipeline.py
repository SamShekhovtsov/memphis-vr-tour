"""Check atlas row convention and packed colour streams independently of a render."""
from pathlib import Path
from PIL import Image
import numpy as np,json,struct,tempfile,sys
sys.path.insert(0,str(Path(__file__).parent/'blender'))
from pack_hero_colours import pack_colours
for kind,values in [(5126,struct.pack('<4f',1,.5,0,1)),(5123,struct.pack('<4H',65535,32768,0,65535))]:
 positions=struct.pack('<3f',1.125,2.25,3.5)
 j={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(values)+12}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(values)},{'buffer':0,'byteOffset':len(values),'byteLength':12}],'accessors':[{'bufferView':0,'componentType':kind,'count':1,'type':'VEC4','normalized':kind==5123},{'bufferView':1,'componentType':5126,'count':1,'type':'VEC3'}],'meshes':[{'primitives':[{'attributes':{'COLOR_0':0,'POSITION':1}}]}]}
 encoded=json.dumps(j).encode();encoded+=b' '*(-len(encoded)%4);binary=values+positions
 glb=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
 with tempfile.TemporaryDirectory(dir=Path('content/generated').resolve(),prefix='finish-pipeline-test-') as d:
  assert Path(d).resolve().parent==Path('content/generated').resolve()
  f=Path(d)/'fixture.glb';f.write_bytes(glb);pack_colours(f);b=f.read_bytes();n=struct.unpack_from('<I',b,12)[0];out=json.loads(b[20:20+n]);blob=b[28+n:]
  assert out['accessors'][0]['componentType']==5121 and out['accessors'][0]['normalized']
  assert blob[:4]==bytes([255,128,0,255]);v=out['bufferViews'][1];assert blob[v['byteOffset']:v['byteOffset']+12]==positions
checks={}
for part in ['near','mid','far']:
 old=np.asarray(Image.open(f'content/source-assets/lighting/steps78-base/{part}-irradiance.png').convert('RGB')).max(2)>1
 new=np.asarray(Image.open(f'content/generated/steps78-build/{part}-irradiance.png').convert('RGB')).max(2)>1
 def iou(a,b):return float(np.count_nonzero(a&b)/np.count_nonzero(a|b))
 score=iou(old,new);flipped=iou(old,new[::-1]);checks[part]={'coverageIoU':score,'flippedCoverageIoU':flipped};assert score>.9 and score>flipped,part+': atlas orientation/coverage mismatch'
checks['colourPack']={'float32AndNormalized16ToRGBA8':True,'otherAttributesByteIdentical':True}
Path('docs/design/steps78-pipeline-checks-2026-10-25.json').write_text(json.dumps(checks,indent=2)+'\n');print(json.dumps(checks,indent=2))
