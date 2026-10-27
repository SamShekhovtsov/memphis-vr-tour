import {surfaceExpected,surfaceRead} from './character-surface-revision.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),path='content/scene-data/character-art.revision.json';
export const artRevision=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)):null;
export function artExpected(f,previous,normalized=false){const r=artRevision?.files[f];if(!r)return surfaceExpected(f,previous,normalized);assert.equal(previous,normalized?r.before:r.beforeRaw,'Character-art baseline mismatch: '+f);return surfaceExpected(f,normalized?r.after:r.afterRaw,normalized);}
export function artRead(f){const r=artRevision?.files[f];if(!r)return surfaceRead(f);assert.equal(sha(surfaceRead(f)),r.afterRaw,'Unrecorded character-art change: '+f);const b=fs.readFileSync(r.baseline);assert.equal(sha(b),r.beforeRaw,'Immutable character-art baseline changed: '+f);return b;}
