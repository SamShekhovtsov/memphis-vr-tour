import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const blender=process.env.BLENDER_BIN??'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe';
const python=process.env.PYTHON_BIN??'python';
execFileSync(blender,['--background','--threads','4','--python-exit-code','1','--python','tools/blender/finish_street_78.py'],{stdio:'inherit'});
execFileSync(blender,['--background','--threads','4','--python-exit-code','1','--python','tools/blender/reexport_street_finish.py'],{stdio:'inherit'});
execFileSync(python,['tools/compose-street-finish.py'],{stdio:'inherit'});
if(process.argv.includes('--promote')){
 const out='content/generated/steps78-build/',target='apps/web-tour/public/assets/authored/hero-street/';
 const names=['manifest.json',...['near','mid','far'].flatMap(p=>[p+'-irradiance.png',p+'-irradiance.webp',...['','.lod1','.lod2'].map(l=>`hero_street_corridor_${p}${l}.glb`)])];
 for(const name of names)fs.copyFileSync(out+name,target+name);
 console.log('Promoted staged existing-surface finish; refresh its bounded revision after review.');
}
