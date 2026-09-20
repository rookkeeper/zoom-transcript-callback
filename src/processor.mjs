import { spawn as spawnProcess } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { appendJsonLine, jobDirectory, piArgs, readCompletionMarker, redactPiOutput } from './pi.mjs';

export function resolveOnPath(candidates, env = process.env) {
  const directories = (env.PATH ?? '').split(':').filter(Boolean);
  for (const dir of directories) {
    for (const name of candidates) {
      const candidate = `${dir}/${name}`;
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch { /* not executable here */ }
    }
  }
  return null;
}

export function createProcessor(config, { spawn = spawnProcess, kill = (pid, signal) => process.kill(-pid, signal), which = (names) => resolveOnPath(names) } = {}) {
  return (details, requestId) => new Promise((resolve, reject) => {
    const cwd = jobDirectory(config.piWorkRoot, requestId);
    const title = `${config.titlePrefix} · ${details.topic}`;
    const values = { ...details, jobDirectory:cwd, peepsSkillDirectory:config.piSkills[0] };
    const prompt = config.promptTemplate.replace(/{{([A-Za-z0-9]+)}}/g, (placeholder,name) => values[name] ?? placeholder);
    const context = { requestId, meetingUuid:details.meetingUuid, meetingId:details.meetingId, recordingFileId:details.recordingFileId };
    const log = (event, fields={}) => appendJsonLine(config.piLogPath, {event,...context,...fields});
    const obsidianPath = which(['obsidian']);
    if (!obsidianPath) {
      const error = 'OBSIDIAN_CLI_MISSING: obsidian executable not found on PATH; check the server PATH includes the Obsidian CLI directory';
      log('pi_failed',{error});
      return resolve({status:'failed',error,metadata:{}});
    }
    log('pi_started',{title,cwd,model:config.piModel || 'default',obsidianPath});
    let child, timer, forceTimer, idleTimer, settled=false, timedOut=false, lastCommand='';
    const idleMs = Number.isFinite(config.piIdleTimeoutMs) ? config.piIdleTimeoutMs : Math.min(config.piTimeoutMs, 10 * 60 * 1000);
    const finish = (status,error,metadata={}) => {
      if(settled) return;
      settled=true; clearTimeout(timer); clearTimeout(idleTimer);
      try { log(`pi_${status}`,{error,pid:child?.pid,...metadata}); resolve({status,error,metadata}); }
      catch(logError) { reject(logError); }
    };
    const armIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer=setTimeout(()=>{
        if(settled) return;
        timedOut=true;
        finish('failed',`Pi stalled with no output for ${Math.round(idleMs/1000)}s${lastCommand?` after: ${lastCommand}`:''}`,{timeoutMs:config.piTimeoutMs,idleMs,lastCommand});
        forceTimer=setTimeout(()=>{try {kill(child.pid,'SIGKILL');} catch {}},5000);
        forceTimer.unref?.();
        try {kill(child.pid,'SIGTERM');} catch {}
      },idleMs);
      idleTimer.unref?.();
    };
    const noteOutput = (command) => { if(command) lastCommand=String(command).slice(0,300); };
    try {
      child=spawn(config.piCli,piArgs({model:config.piModel,skills:config.piSkills,title,prompt}),{
        detached:true,stdio:['ignore','pipe','pipe'],cwd,
        env:{...process.env},
      });
    } catch(error) { finish('failed','Pi could not start',{code:error.code || 'unknown'}); return; }
    armIdleTimer();
    for(const stream of ['stdout','stderr']) child[stream].on('data',chunk=>{
      noteOutput(redactPiOutput(chunk,details.downloadToken).slice(0,300)); armIdleTimer();
      try { log(`pi_${stream}`,{output:redactPiOutput(chunk,details.downloadToken)}); }
      catch(error) { finish('failed','Execution log write failed'); try { kill(child.pid,'SIGTERM'); } catch {} }
    });
    child.once('error',error=>finish('failed','Pi could not start',{code:error.code || 'unknown'}));
    child.once('close',(code,signal)=>{
      clearTimeout(forceTimer); clearTimeout(idleTimer);
      if(settled) return;
      if(timedOut) { finish('failed','Pi timed out',{code,signal,timeoutMs:config.piTimeoutMs}); return; }
      if(code!==0 || signal) { finish('failed','Pi exited unsuccessfully; inspect private execution log',{code,signal}); return; }
      const completion=readCompletionMarker(cwd);
      if(!completion) { finish('incomplete','Missing completion marker'); return; }
      const metadata={summary:typeof completion.summary==='string'?redactPiOutput(completion.summary,details.downloadToken):''};
      if(Array.isArray(completion.notePaths)) metadata.notePaths=completion.notePaths.filter(x=>typeof x==='string').map(x=>redactPiOutput(x,details.downloadToken));
      try { appendJsonLine(config.successLogPath,{event:'transcript_processed',...context,recordingFileName:details.recordingFileName,pid:child.pid,...metadata}); }
      catch { finish('failed','Success ledger write failed'); return; }
      finish('succeeded',null,metadata);
    });
    timer=setTimeout(()=>{
      timedOut=true;
      // Record timeout even if the child does not cooperate with termination.
      finish('failed','Pi timed out',{timeoutMs:config.piTimeoutMs});
      forceTimer=setTimeout(()=>{try {kill(child.pid,'SIGKILL');} catch {}},5000);
      forceTimer.unref();
      try {kill(child.pid,'SIGTERM');} catch {}
    },config.piTimeoutMs);
  });
}
