import {interactionExpected} from './lib/district-interaction-revision.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {finishExpected} from './lib/street-finish-revision.mjs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const text=f=>fs.readFileSync(f,'utf8').replaceAll('\r\n','\n');
const r=JSON.parse(fs.readFileSync('content/scene-data/hero-street.render-performance-revision.json'));
assert.equal(r.hook.file,'apps/web-tour/src/scene/HumanContactShadows.ts');
assert.equal(r.implementation.file,'apps/web-tour/src/scene/RenderWorkOptimization.ts');
let original=text(r.hook.file);assert.equal(sha(original),r.hook.afterSha);
assert.deepEqual(r.hook.edits,[{before:'',after:'import { configureRenderWork } from "./RenderWorkOptimization";\n'},{before:'',after:'  configureRenderWork(scene);\n'}]);
for(const edit of r.hook.edits){assert.equal(original.split(edit.after).length,2);original=original.replace(edit.after,edit.before);}
assert.equal(sha(original),r.hook.beforeSha,'Unrecorded shadow behavior change');
assert.equal(sha(text(r.implementation.file)),r.implementation.sha256);
for(const [file,record] of Object.entries(r.protectedFiles))assert.equal(sha(record.normalizedText?text(file):fs.readFileSync(file)),interactionExpected(file,finishExpected(file,record.sha256),record.normalizedText),'Visual/layout/motion/IK source or asset changed: '+file);
console.log(`Render integrity passed: shadow hook reconstructed; ${Object.keys(r.protectedFiles).length} protected source/data/assets checked, including bounded finish revisions`);
