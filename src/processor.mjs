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

export function createProcessor(config, {
  spawn = spawnProcess,
  kill = (pid, signal) => process.kill(-pid, signal),
  which = (names) => resolveOnPath(names),
  downloadAssets = config.downloadAssets,
} = {}) {
  return async (details, requestId) => {
    const cwd = jobDirectory(config.piWorkRoot, requestId);
    const context = { requestId, meetingUuid: details.meetingUuid, meetingId: details.meetingId };
    const log = (event, fields = {}) => appendJsonLine(config.piLogPath, { event, ...context, ...fields });
    let assets = null;
    let concurrentPi = null;

    if (downloadAssets) {
      try {
        assets = await downloadAssets(details.meetingId, {
          onTranscriptReady: ready => {
            concurrentPi = createProcessor({ ...config, downloadAssets: async () => ready }, { spawn, kill, which, downloadAssets: async () => ready })(details, requestId);
          },
        });
        log('zoom_assets_ready', {
          meetingFolder: assets.directory,
          transcriptPath: assets.transcriptPath,
          assetCount: assets.files.length,
        });
      } catch (error) {
        const message = `Zoom asset download failed: ${error.message}`;
        log('zoom_assets_failed', { error: message });
        try {
          appendJsonLine(config.successLogPath, { event: 'transcript_failed', status: 'failed', ...context, error: message });
        } catch {
          // Best effort: the execution log already records the outcome.
        }
        return { status: 'failed', error: message, metadata: {} };
      }
    }

    if (concurrentPi) {
      const result = await concurrentPi;
      if (result.status !== 'succeeded') return result;
      return { ...result, metadata: { ...result.metadata, verifiedAssets: assets?.verified ?? false, deletedAssets: assets?.deleted?.length ?? 0 } };
    }

    const title = `${config.titlePrefix} · ${details.topic}`;
    const values = {
      ...details,
      jobDirectory: cwd,
      peepsSkillDirectory: config.piSkills[0],
      repoSkillDirectory: config.repoSkillDirectory,
      meetingFolder: assets?.directory ?? '',
      transcriptPath: assets?.transcriptPath ?? '',
      callbackData: JSON.stringify({
        ...details,
        jobDirectory: cwd,
        meetingFolder: assets?.directory ?? '',
        transcriptPath: assets?.transcriptPath ?? '',
      }, null, 2),
    };
    const prompt = config.promptTemplate.replace(/{{([A-Za-z0-9]+)}}/g, (placeholder, name) => values[name] ?? placeholder);
    const obsidianPath = which(['obsidian']);
    if (!obsidianPath) {
      const error = 'OBSIDIAN_CLI_MISSING: obsidian executable not found on PATH; check the server PATH includes the Obsidian CLI directory';
      log('pi_failed', { error });
      try {
        appendJsonLine(config.successLogPath, { event: 'transcript_failed', status: 'failed', ...context, error });
      } catch {
        // Best effort: the execution log already records the outcome.
      }
      return { status: 'failed', error, metadata: {} };
    }

    log('pi_started', { title, cwd, model: config.piModel || 'default', obsidianPath });
    return new Promise((resolve, reject) => {
      let child, timer, forceTimer, idleTimer, settled = false, timedOut = false, lastCommand = '';
      const idleMs = Number.isFinite(config.piIdleTimeoutMs) ? config.piIdleTimeoutMs : Math.min(config.piTimeoutMs, 10 * 60 * 1000);
      const assetMetadata = assets ? {
        meetingFolder: assets.directory,
        transcriptPath: assets.transcriptPath,
        assetCount: assets.files.length,
      } : {};
      // The completion ledger records every terminal Pi outcome, not just
      // successes: `transcript_processed` on verified success, otherwise
      // `transcript_failed` with the status and error.
      const ledger = (status, error, metadata = {}) => {
        appendJsonLine(config.successLogPath, {
          event: status === 'succeeded' ? 'transcript_processed' : 'transcript_failed',
          status,
          ...context,
          pid: child?.pid,
          ...(error ? { error } : {}),
          ...metadata,
        });
      };
      const finish = (status, error, metadata = {}) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(idleTimer);
        try {
          log(`pi_${status}`, { error, pid: child?.pid, ...metadata });
        } catch (logError) {
          reject(logError);
          return;
        }
        try {
          ledger(status, error, metadata);
        } catch {
          if (status === 'succeeded') {
            // Never report success without ledger evidence.
            try { log('pi_failed', { error: 'Success ledger write failed', pid: child?.pid }); } catch {}
            resolve({ status: 'failed', error: 'Success ledger write failed', metadata });
            return;
          }
          // Best effort: the execution log already records the outcome.
        }
        resolve({ status, error, metadata });
      };
      const armIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (settled) return;
          timedOut = true;
          finish('failed', `Pi stalled with no output for ${Math.round(idleMs / 1000)}s${lastCommand ? ` after: ${lastCommand}` : ''}`, { timeoutMs: config.piTimeoutMs, idleMs, lastCommand });
          forceTimer = setTimeout(() => { try { kill(child.pid, 'SIGKILL'); } catch {} }, 5000);
          forceTimer.unref?.();
          try { kill(child.pid, 'SIGTERM'); } catch {}
        }, idleMs);
        idleTimer.unref?.();
      };
      const noteOutput = (command) => { if (command) lastCommand = String(command).slice(0, 300); };
      try {
        child = spawn(config.piCli, piArgs({ model: config.piModel, skills: config.piSkills, title, prompt }), {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd,
          env: { ...process.env },
        });
      } catch (error) {
        finish('failed', 'Pi could not start', { code: error.code || 'unknown' });
        return;
      }
      armIdleTimer();
      for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => {
        const output = redactPiOutput(chunk);
        noteOutput(output);
        armIdleTimer();
        try { log(`pi_${stream}`, { output }); }
        catch (error) { finish('failed', 'Execution log write failed'); try { kill(child.pid, 'SIGTERM'); } catch {} }
      });
      child.once('error', error => finish('failed', 'Pi could not start', { code: error.code || 'unknown' }));
      child.once('close', (code, signal) => {
        clearTimeout(forceTimer);
        clearTimeout(idleTimer);
        if (settled) return;
        if (timedOut) { finish('failed', 'Pi timed out', { code, signal, timeoutMs: config.piTimeoutMs }); return; }
        if (code !== 0 || signal) { finish('failed', 'Pi exited unsuccessfully; inspect private execution log', { code, signal }); return; }
        const completion = readCompletionMarker(cwd);
        if (!completion) { finish('incomplete', 'Missing completion marker'); return; }
        const metadata = {
          ...assetMetadata,
          summary: typeof completion.summary === 'string' ? redactPiOutput(completion.summary) : '',
        };
        if (Array.isArray(completion.notePaths)) metadata.notePaths = completion.notePaths.filter(x => typeof x === 'string').map(redactPiOutput);
        finish('succeeded', null, metadata);
      });
      timer = setTimeout(() => {
        timedOut = true;
        finish('failed', 'Pi timed out', { timeoutMs: config.piTimeoutMs });
        forceTimer = setTimeout(() => { try { kill(child.pid, 'SIGKILL'); } catch {} }, 5000);
        forceTimer.unref();
        try { kill(child.pid, 'SIGTERM'); } catch {}
      }, config.piTimeoutMs);
    });
  };
}
