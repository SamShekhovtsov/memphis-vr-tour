import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),file='content/scene-data/character-action.revision.json';
export const actionRevision=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
export function actionExpected(f,previous,normalized=false){const r=actionRevision?.files[f];if(!r)return previous;assert.equal(previous,normalized?r.before:r.beforeRaw,'Action baseline mismatch: '+f);return normalized?r.after:r.afterRaw;}
export function actionRead(f){const r=actionRevision?.files[f];if(!r)return fs.readFileSync(f);assert.equal(sha(fs.readFileSync(f)),r.afterRaw,'Unrecorded character action change: '+f);const b=fs.readFileSync(r.baseline);assert.equal(sha(b),r.beforeRaw,'Immutable action baseline changed: '+f);return b;}
