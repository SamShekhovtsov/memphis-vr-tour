import {execFileSync} from 'node:child_process';
// Legacy disables only the material binder and new vertex colours. Its three
// canonical screenshots are pixel-identical to the original unmodified assets.
for(let run=1;run<=3;run++)for(const phase of ['before','after']) {
  execFileSync(process.execPath,['tools/capture-hero-shot.mjs',`people-materials-benchmark-${phase}-${run}`,
    '--hardware','--benchmark',...(phase==='before'?['--legacy-people-materials']:[])],
    {stdio:'inherit',env:{...process.env,CDP_PORT:String(9420+run*2+(phase==='after'?1:0))}});
}
