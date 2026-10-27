import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const blender=process.env.CHARACTER_ART_BLENDER_BIN??'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe';
if(!fs.existsSync(blender))throw Error('Set CHARACTER_ART_BLENDER_BIN to Blender 5.1');
if(!execFileSync(blender,['--version'],{encoding:'utf8'}).startsWith('Blender 5.1'))throw Error('Character-art reference reduction is pinned to Blender 5.1');
const run=(script,args=[])=>execFileSync(blender,['--background','--python-exit-code','1','--python',script,...(args.length?['--',...args]:[])],{stdio:'inherit'});
if(!process.argv.includes('--step=1'))run('tools/blender/prepare_character_reference.py');
run('tools/blender/character_art_pass.py',[process.argv.includes('--step=1')?'--step=1':'--step=2']);
run('tools/blender/audit_character_art_poses.py');
run('tools/blender/build_crowd_lods.py');
// Keep recorded text hashes portable across Windows and Unix checkouts.
for(const f of ['apps/web-tour/public/assets/authored/people/manifest.json','apps/web-tour/public/assets/authored/people/crowd/manifest.json'])fs.writeFileSync(f,fs.readFileSync(f,'utf8').replaceAll('\r\n','\n'));
execFileSync(process.execPath,['tools/record-character-art.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/validate-character-art.mjs'],{stdio:'inherit'});
