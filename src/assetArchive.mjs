import { createWriteStream, existsSync, mkdirSync, statSync, renameSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { zoomApi, loadStoredTokens } from './zoomOAuth.mjs';
import { zoomAuth, assetNamer, isTranscriptFile, meetingAssets, safeTopic, DEFAULT_ZOOM_ROOT } from './zoomDownloads.mjs';
import { appendJsonLine } from './pi.mjs';

export async function retry(operation, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= attempts || (error.status >= 400 && error.status < 500 && ![408,429].includes(error.status))) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    }
  }
}

export async function getRecordingIndex(config, meetingId, destination) {
  const meeting = await retry(() => zoomApi(zoomAuth(config), `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`));
  const directory = destination ?? join(DEFAULT_ZOOM_ROOT, `${(meeting.start_time ?? '').slice(0,10)} ${safeTopic(meeting.topic)}`);
  mkdirSync(directory, { recursive: true });
  const files = meetingAssets(meeting).filter(f => f.status === 'completed');
  const transcript = files.find(isTranscriptFile);
  if (!transcript) throw new Error('No completed transcript');
  // Walk both Zoom collections (layouts and per-participant audio) and
  // disambiguate any repeated names by file ID.
  return { meeting, meetingId, directory, transcript, files, nameOf: assetNamer(files) };
}

function valid(path, file) {
  if (!existsSync(path)) return false;
  const size = statSync(path).size;
  // Legacy nonempty files are NOT proof of completed downloads.
  if (Number(file.file_size) > 0) return size === Number(file.file_size);
  try { const receipt = JSON.parse(readFileSync(`${path}.verified.json`, 'utf8')); return size > 0 && receipt.id === file.id && receipt.size === size; } catch { return false; }
}

export async function ensureLocal(config, index, file) {
  const path = join(index.directory, index.nameOf(file));
  if (valid(path, file)) return path;
  await retry(async () => {
    const part = `${path}.part`;
    try {
      const tokens = loadStoredTokens(config.zoomOAuthStorePath);
      const response = await fetch(file.download_url, { headers: { authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(60 * 60 * 1000) });
      if (!response.ok) throw Object.assign(new Error(`Download HTTP ${response.status}`), { status: response.status });
      await pipeline(response.body, createWriteStream(part));
      const size = statSync(part).size;
      if (!size || (Number(file.file_size) > 0 && size !== Number(file.file_size))) throw new Error('Downloaded size mismatch');
      renameSync(part, path);
      writeFileSync(`${path}.verified.json`, JSON.stringify({ id: file.id, size }), { mode: 0o600 });
    } finally { rmSync(part, { force: true }); }
  });
  return path;
}

export async function downloadAndDeleteOne(config, index, file) {
  const path = await ensureLocal(config, index, file);
  if (!existsSync(path) || statSync(path).size <= 0 || (Number(file.file_size) > 0 && !valid(path, file))) throw new Error('Local verification failed');
  await retry(() => zoomApi(zoomAuth(config), `/v2/meetings/${encodeURIComponent(index.meetingId)}/recordings/${encodeURIComponent(file.id)}`, { method: 'DELETE' }));
  if (config.piLogPath) appendJsonLine(config.piLogPath, { event: 'asset_archived', meetingId: index.meetingId, fileId: file.id, name: index.nameOf(file) });
  return { id: file.id, name: index.nameOf(file), status: 'succeeded', deleted: true };
}

export async function runWithWorkers(items, workers, operation) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { results[i] = await operation(items[i]); }
      catch (error) { results[i] = { id: items[i].id, status: 'failed', error: error.message }; }
    }
  }));
  return results;
}

export function archiveMedia(config, index) {
  return runWithWorkers(index.files.filter(f => f !== index.transcript), 3, file => downloadAndDeleteOne(config, index, file));
}
