import {actionExpected,actionRead} from './character-action-revision.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const path='content/scene-data/character-surface.revision.json';
export const surfaceRevision=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
export function surfaceExpected(f,previous,normalized=false){
 const r=surfaceRevision?.files[f];if(!r)return actionExpected(f,previous,normalized);
 assert.equal(previous,normalized?r.before:r.beforeRaw,'Surface baseline mismatch: '+f);
 return actionExpected(f,normalized?r.after:r.afterRaw,normalized);
}
export function surfaceRead(f){
 const r=surfaceRevision?.files[f];if(!r)return actionRead(f);
 assert.equal(sha(actionRead(f)),r.afterRaw,'Unrecorded character-surface change: '+f);
 const b=fs.readFileSync(r.baseline);assert.equal(sha(b),r.beforeRaw,'Immutable surface baseline changed: '+f);return b;
}
