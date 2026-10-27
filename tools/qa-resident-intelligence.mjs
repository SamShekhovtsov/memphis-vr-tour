import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
for(const [label,audit]of [['purposeful-final-audit','audit-resident-intelligence.js'],['purposeful-traversal','audit-zones-steps.js']]){
 execFileSync(process.execPath,['tools/capture-hero-shot.mjs',label,'--hardware','--audit-script=tools/'+audit],{stdio:'inherit'});
 const report=JSON.parse(fs.readFileSync(`docs/design/screenshots/hero-street-main-${label}.json`));
 assert.equal(report.interactionAudit.passed,true,JSON.stringify(report.interactionAudit.checks.filter(c=>!c.passed)));
 console.log(`${label}: ${report.interactionAudit.checks.length} live checks passed`);
}
