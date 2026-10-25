import {execFileSync} from 'node:child_process';
const blender=process.env.BLENDER_BIN??'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe';
const python=process.env.PYTHON_BIN??'python';
execFileSync(blender,['--background','--threads','4','--python-exit-code','1','--python','tools/blender/repair_exterior_charts.py'],{stdio:'inherit'});
execFileSync(python,['tools/compose-exterior-repair.py'],{stdio:'inherit'});
execFileSync(python,['tools/verify-exterior-repair.py'],{stdio:'inherit'});

execFileSync(blender,['--background','--threads','4','--python-exit-code','1','--python','tools/blender/repair_cloth_overlaps.py'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/promote-cloth-repair.mjs'],{stdio:'inherit'});
execFileSync(python,['tools/verify-image-quality-geometry.py'],{stdio:'inherit'});
