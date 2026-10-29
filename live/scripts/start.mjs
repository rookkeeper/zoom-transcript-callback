import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.mjs';
import { TranscriptState } from '../state.mjs';
import { RtmsController } from '../rtms.mjs';
import { createLiveService } from '../server.mjs';

let service;
try {
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  // Node preserves already exported values (including --env-file) over these defaults.
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  const config = loadConfig(process.env);
  const state = new TranscriptState();
  const controller = new RtmsController({ ...config, state });
  service = createLiveService({ ...config, state, controller });
  const ports = await service.listen(config);
  console.info(`Live transcript: webhook :${ports.webhookPort}/zoom/rtms; private http://127.0.0.1:${ports.uiPort}/live`);
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await service.close(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
} catch (error) {
  await service?.close();
  // Deliberately omit stacks, values, URLs and third-party error text.
  console.error(error.code === 'EADDRINUSE' ? 'Live startup failed: port already in use; no existing listener was stopped.' : 'Live startup failed: check required Zoom credentials and LIVE_* configuration.');
  process.exitCode = 1;
}
