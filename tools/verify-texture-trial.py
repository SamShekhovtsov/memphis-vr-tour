from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
root=Path('apps/web-tour/public/assets/authored/hero-street');results={}
for c in ['albedo','normal','orm']:
 a=np.asarray(Image.open(root/f'hero-plaster-{c}.png').convert('RGB'),dtype=float)
 b=np.asarray(Image.open(f'content/generated/ktx-trial-decoded/hero-plaster-{c}.png').convert('RGB'),dtype=float)
 diff=np.abs(a-b);mse=float(np.mean((a-b)**2));r={'rmsByteError':mse**.5,'maxByteError':float(diff.max()),'p99ByteError':float(np.percentile(diff,99)),'psnrDb':float(10*np.log10(255**2/max(1e-12,mse)))}
 if c=='normal':
  x=a/127.5-1;y=b/127.5-1;x/=np.maximum(1e-8,np.linalg.norm(x,axis=2,keepdims=True));y/=np.maximum(1e-8,np.linalg.norm(y,axis=2,keepdims=True));angle=np.degrees(np.arccos(np.clip(np.sum(x*y,axis=2),-1,1)));r['p95Degrees']=float(np.percentile(angle,95));r['maximumDegrees']=float(angle.max());assert r['p95Degrees']<=1
 elif c=='albedo':assert r['psnrDb']>=42 and r['p99ByteError']<=5
 else:assert np.percentile(diff[:,:,1],99)<=5
 results[c]=r
Path('docs/design/steps78-compression-quality-2026-10-25.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
