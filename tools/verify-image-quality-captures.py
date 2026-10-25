from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];directory=root/'docs/design/screenshots'
comparisons={}
for shot in ['hero-street-main','street-entry','hero-street-material']:
 before=json.loads((directory/f'{shot}-image-quality-before.json').read_text());after=json.loads((directory/f'{shot}-image-quality-after.json').read_text())
 assert before['camera']==after['camera'],shot
 assert before['viewport']==after['viewport'],shot
 assert before['heroPeople']==after['heroPeople']==9
 assert after['interactionAudit']['passed'],after['interactionAudit']
 comparisons[shot]={'camera':after['camera'],'viewport':after['viewport'],'qualityChecks':len(after['interactionAudit']['checks'])}
a=np.asarray(Image.open(directory/'street-entry-image-quality-after.png').convert('RGB'),dtype=np.int16)
b=np.asarray(Image.open(directory/'street-entry-image-quality-depth-control.png').convert('RGB'),dtype=np.int16)
d=np.abs(a-b);depth={'identical':bool(np.array_equal(a,b)),'meanChannelDifference':float(d.mean()),'maxChannelDifference':int(d.max()),'changedPixels':int(np.any(d,axis=2).sum())}
assert depth['maxChannelDifference']<=1,depth
result={'matchedCameras':comparisons,'depthOptimizationColorCheck':depth}
(root/'docs/design/image-quality-capture-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
