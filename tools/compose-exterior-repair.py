"""Replace only the diagnosed exterior UV charts; retain the reviewed atlas elsewhere."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root=Path(__file__).resolve().parents[1]
source=root/'content/source-assets/lighting/exterior-repair'
target=root/'apps/web-tour/public/assets/authored/hero-street'
record=json.loads((source/'manifest.json').read_text())
manifest=json.loads((target/'manifest.json').read_text())
baseline=source/'baseline';baseline.mkdir(exist_ok=True)
names=[f'hero_street_corridor_{part}{lod}.glb' for part in record['parts'] for lod in ['', '.lod1', '.lod2']]+['manifest.json']+[f'{p}-irradiance.{ext}' for p in record['parts'] for ext in ['png','webp']]
for name in names:
 if not (baseline/name).exists():(baseline/name).write_bytes((target/name).read_bytes())
audit={}
for part,info in record['parts'].items():
 raw=np.load(source/f'{part}-repair.npz');light=(raw['sky']+raw['bounce'])[::-1]
 mask=Image.new('L',(2048,2048));draw=ImageDraw.Draw(mask)
 for polygon in info['uvPolygons']:draw.polygon([(u*2048,(1-v)*2048) for u,v in polygon],fill=255)
 mask=mask.filter(ImageFilter.MaxFilter(7));selected=np.asarray(mask)>0
 assert np.isfinite(light).all()
 old=np.asarray(Image.open(baseline/f'{part}-irradiance.png').convert('RGB')).copy()
 encoded=np.rint(np.clip(light/manifest['finalLighting']['irradianceRange'],0,1)*255).astype('uint8')
 image=Image.fromarray(encoded).filter(ImageFilter.MedianFilter(3));encoded=np.asarray(image)
 new=old.copy();new[selected]=encoded[selected]
 image=Image.fromarray(new);image.save(target/f'{part}-irradiance.png');image.save(target/f'{part}-irradiance.webp',lossless=True,method=6)
 assert Image.open(target/f'{part}-irradiance.webp').convert('RGB').tobytes()==image.tobytes()
 assert np.array_equal(old[~selected],new[~selected])
 audit[part]={'selectedPixels':int(selected.sum()),'oldMean':float(old[selected].mean()/255),'newMean':float(new[selected].mean()/255),'linearMaximum':float(light[selected].max()),'clippedChannels':int((light[selected]>1).sum()),'unchangedOutsideMask':True}
for part in record['parts']:
 for lod in ['', '.lod1', '.lod2']:
  name=f'hero_street_corridor_{part}{lod}.glb';(target/name).write_bytes((source/name).read_bytes())
manifest['assets']=[next((r for r in record['replacementBindings'] if r['assetId']==a['assetId']),a) for a in manifest['assets']]
manifest['materials'].update(record['replacementMaterials'])
manifest['exteriorRepair']={'source':'content/source-assets/lighting/exterior-repair','method':record['method'],'sampleOffsetMeters':.04,'vertexPositionsChanged':False,'normalsCorrected':True,'reversedPanelFaces':sum(p['reversedPanelFaces'] for p in record['parts'].values()),'audit':audit}
names={a['irradiance'] for a in manifest['assets']}|{f'{s}-{c}.png' for s in manifest['surfaceFamilies'] for c in ('albedo','normal','orm')}
manifest['deliveryCompression']['sourceBytes']=sum((target/n).stat().st_size for n in names)
manifest['deliveryCompression']['deliveryBytes']=sum((target/Path(n).with_suffix('.webp')).stat().st_size for n in names)
(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
(source/'composition-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print(json.dumps(audit))
