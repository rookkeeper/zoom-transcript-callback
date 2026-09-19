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
    const config={piWorkRoot:root,piCli:'fake',piSkills:['/skill'],piModel:'test',titlePrefix:'Zoom',promptTemplate:'{{topic}} {{jobDirectory}}',piLogPath:join(root,'pi.jsonl'),successLogPath:join(root,'success.jsonl'),piTimeoutMs:outcome==='timeout'?10:10000,piIdleTimeoutMs:5000};
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

test('Pi processor fails fast when the child goes silent (idle watchdog)', async t => {
  const root=mkdtempSync(join(tmpdir(),'processor-idle-')); t.after(()=>rmSync(root,{recursive:true,force:true}));
  const config={piWorkRoot:root,piCli:'fake',piSkills:['/skill'],piModel:'test',titlePrefix:'Zoom',promptTemplate:'{{topic}}',piLogPath:join(root,'pi.jsonl'),successLogPath:join(root,'success.jsonl'),piTimeoutMs:10000,piIdleTimeoutMs:30};
  const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stderr=new EventEmitter(); child.pid=456;
  let killed=false;
  const processor=createProcessor(config,{spawn:()=>child,kill:()=>{killed=true;child.emit('close',null,'SIGTERM');}});
  const started=Date.now();
  const result=await processor({topic:'Meeting',meetingId:'42'},'job');
  assert.equal(result.status,'failed');
  assert.match(result.error,/stalled with no output/i);
  assert.ok(Date.now()-started<5000,'idle watchdog fired well before the outer timeout');
  assert.equal(killed,true);
});

test('Pi processor fails fast with a greppable error when obsidian is missing from PATH', async t => {
  const root=mkdtempSync(join(tmpdir(),'processor-obsidian-')); t.after(()=>rmSync(root,{recursive:true,force:true}));
  const config={piWorkRoot:root,piCli:'fake',piSkills:['/skill'],piModel:'test',titlePrefix:'Zoom',promptTemplate:'{{topic}}',piLogPath:join(root,'pi.jsonl'),successLogPath:join(root,'success.jsonl'),piTimeoutMs:10000,piIdleTimeoutMs:5000};
  let spawned=false;
  const processor=createProcessor(config,{spawn:()=>{spawned=false;throw new Error('should not spawn');},which:()=>null});
  const result=await processor({topic:'Meeting',meetingId:'42'},'job');
  assert.equal(spawned,false);
  assert.equal(result.status,'failed');
  assert.match(result.error,/OBSIDIAN_CLI_MISSING/);
  const logged=readFileSync(config.piLogPath,'utf8');
  assert.match(logged,/OBSIDIAN_CLI_MISSING/);
});

test('Pi processor passes PATH through unchanged and spawns when obsidian resolves', async t => {
  const root=mkdtempSync(join(tmpdir(),'processor-obsidian-ok-')); t.after(()=>rmSync(root,{recursive:true,force:true}));
  const config={piWorkRoot:root,piCli:'fake',piSkills:['/skill'],piModel:'test',titlePrefix:'Zoom',promptTemplate:'{{topic}} {{jobDirectory}}',piLogPath:join(root,'pi.jsonl'),successLogPath:join(root,'success.jsonl'),piTimeoutMs:10000,piIdleTimeoutMs:5000};
  const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stderr=new EventEmitter(); child.pid=321;
  let seenEnv=null;
  const spawn=(_cmd,_args,options)=>{seenEnv=options.env;writeFileSync(join(options.cwd,'zoom-processing-result.json'),JSON.stringify({status:'completed',summary:'Done'}));setImmediate(()=>child.emit('close',0,null));return child;};
  const processor=createProcessor(config,{spawn,which:()=>'/usr/local/bin/obsidian'});
  const result=await processor({topic:'Meeting',meetingId:'42'},'job');
  assert.equal(result.status,'succeeded');
  assert.equal(seenEnv.PATH,process.env.PATH);
});

test('Pi processor resets the idle watchdog on child output', async t => {
  const root=mkdtempSync(join(tmpdir(),'processor-idle-reset-')); t.after(()=>rmSync(root,{recursive:true,force:true}));
  const config={piWorkRoot:root,piCli:'fake',piSkills:['/skill'],piModel:'test',titlePrefix:'Zoom',promptTemplate:'{{topic}}',piLogPath:join(root,'pi.jsonl'),successLogPath:join(root,'success.jsonl'),piTimeoutMs:10000,piIdleTimeoutMs:80};
  const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stderr=new EventEmitter(); child.pid=789;
  const keepalive=setInterval(()=>child.stdout.emit('data','still working'),30); t.after(()=>clearInterval(keepalive));
  const processor=createProcessor(config,{spawn:()=>child,kill:()=>{}});
  const pending=processor({topic:'Meeting',meetingId:'42'},'job');
  await new Promise(r=>setTimeout(r,200));
  clearInterval(keepalive);
  writeFileSync(join(config.piWorkRoot,'job','zoom-processing-result.json'),JSON.stringify({status:'completed',summary:'Done'}));
  child.emit('close',0,null);
  const result=await pending;
  assert.equal(result.status,'succeeded');
});
