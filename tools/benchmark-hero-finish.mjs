/** Three alternating comparisons of the archived and final visual assets.
 * Always restores the final files, even if Chrome fails. No server restart or
 * camera/scene-code edits; each capture starts a fresh browser process.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const target = path.resolve('apps/web-tour/public/assets/authored/hero-street');
const archive = path.resolve('content/generated/surfaces34-before/hero-street');
const final = path.resolve('content/generated/surfaces34-final/hero-street');
assert.ok(target.startsWith(path.resolve('apps/web-tour/public/assets')+path.sep));
assert.ok(fs.existsSync(archive+'/manifest.json'),'Capture the real baseline first');
fs.mkdirSync(final,{recursive:true});
const names = fs.readdirSync(archive).filter(name=>fs.statSync(path.join(archive,name)).isFile());
// Only files present in the baseline need swapping. New finish maps remain
// unused while the baseline manifest is active.
for (const name of names) fs.copyFileSync(path.join(target,name),path.join(final,name));
const restore = source => {
  for (const name of names) fs.writeFileSync(path.join(target,name),fs.readFileSync(path.join(source,name)));
};
try {
  for (let run=1;run<=3;run++) for (const phase of ['before','after']) {
    restore(phase==='before'?archive:final);
    execFileSync(process.execPath,['tools/capture-hero-shot.mjs',`surfaces34-benchmark-${phase}-${run}`,'--benchmark','--hardware'],
      {stdio:'inherit',env:{...process.env,CDP_PORT:String(9390+run*2+(phase==='after'?1:0))}});
  }
} finally {
  restore(final);
}
