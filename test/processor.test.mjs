import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProcessor } from '../src/processor.mjs';

for (const outcome of ['success','exit','spawn','missing','timeout']) {
  test(`Pi processor records ${outcome} and writes ledger only for verified success`, async t => {
    const root=mkdtempSync(join(tmpdir(),'processor-')); t.after(()=>rmSync(root,{recursive:true,force:true}));
    const config={piWorkRoot:root,piCli:'fake',piSkills:['/skill'],piModel:'test',titlePrefix:'Zoom',promptTemplate:'{{topic}} {{jobDirectory}}',piLogPath:join(root,'pi.jsonl'),successLogPath:join(root,'success.jsonl'),piTimeoutMs:10};
    const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stderr=new EventEmitter(); child.pid=123;
    let killed=false;
    const spawn=(_cmd,_args,options)=>{
      if(outcome==='success') writeFileSync(join(options.cwd,'zoom-processing-result.json'),JSON.stringify({status:'completed',summary:'Done',notePaths:['Tom.md']}));
      setImmediate(()=>{
        child.stderr.emit('data','Authorization: Bearer test-download-credential');
        if(outcome==='spawn') child.emit('error',Object.assign(new Error('unavailable'),{code:'ENOENT'}));
        else if(outcome!=='timeout') child.emit('close',outcome==='exit'?1:0,null);
      });
      return child;
    };
    const processor=createProcessor(config,{spawn,kill:()=>{killed=true;child.emit('close',null,'SIGTERM');}});
    const result=await processor({topic:'Meeting',meetingId:'42',downloadToken:'test-download-credential'},'job');
    assert.equal(result.status,outcome==='success'?'succeeded':outcome==='missing'?'incomplete':'failed');
    assert.equal(existsSync(config.successLogPath),outcome==='success');
    assert.ok(!readFileSync(config.piLogPath,'utf8').includes('test-download-credential'));
    if(outcome==='success') assert.deepEqual(result.metadata.notePaths,['Tom.md']);
    if(outcome==='timeout'){assert.equal(killed,true);assert.match(result.error,/timed out/i);}
  });
}
