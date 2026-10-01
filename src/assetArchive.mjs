import { createWriteStream, existsSync, mkdirSync, statSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { zoomApi, loadStoredTokens } from './zoomOAuth.mjs';
import { zoomAuth, assetNamer, isTranscriptFile, meetingAssets, safeTopic, DEFAULT_ZOOM_ROOT } from './zoomDownloads.mjs';

export async function retry(operation, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= attempts || (error.status >= 400 && error.status < 500 && ![408,429].includes(error.status))) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    }
  }
}

// Fetch one completed asset listing covering both of Zoom's collections:
// recording_files (layouts, audio, chat, timeline, captions, transcript) and
// participant_audio_files (one M4A per participant).
export async function listAssets(config, meetingId) {
  const meeting = await retry(() => zoomApi(zoomAuth(config), `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`));
  const directory = join(DEFAULT_ZOOM_ROOT, `${(meeting.start_time ?? '').slice(0,10)} ${safeTopic(meeting.topic)}`);
  mkdirSync(directory, { recursive: true });
  const files = meetingAssets(meeting).filter(f => f.status === 'completed');
  const transcript = files.find(isTranscriptFile);
  if (!transcript) throw new Error(`Meeting ${meetingId} has no completed transcript`);
  return { meeting, meetingId, directory, transcript, files, nameOf: assetNamer(files) };
}

export async function downloadTranscript(config, index, file) {
  const path = join(index.directory, index.nameOf(file));
  const api = Number(file.file_size) || 0;
  if (existsSync(path) && statSync(path).size > 0 && (!api || statSync(path).size === api)) return path;
  await retry(async () => {
    const part = `${path}.part`;
    try {
      const tokens = loadStoredTokens(config.zoomOAuthStorePath);
      const response = await fetch(file.download_url, { headers: { authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(60 * 60 * 1000) });
      if (!response.ok) throw Object.assign(new Error(`Asset ${index.nameOf(file)} download failed: HTTP ${response.status}`), { status: response.status });
      await pipeline(response.body, createWriteStream(part));
      const size = statSync(part).size;
      if (!size || (api && size !== api)) throw Object.assign(new Error(`Downloaded size mismatch for ${index.nameOf(file)}`), { status: 0 });
      renameSync(part, path);
    } finally { rmSync(part, { force: true }); }
  });
  return path;
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

export function downloadAssets(config, index) {
  return runWithWorkers(index.files.filter(f => f !== index.transcript), 3, async file => {
    const path = await downloadTranscript(config, index, file);
    return { id: file.id, name: index.nameOf(file), status: 'succeeded', bytes: statSync(path).size };
  });
}

export function verifyLocal(index) {
  const expected = index.files.map(index.nameOf).sort();
  const actual = index.files.map(index.nameOf)
    .filter(name => existsSync(join(index.directory, name)) && statSync(join(index.directory, name)).size > 0).sort();
  if (expected.join('\n') !== actual.join('\n')) {
    throw new Error(`Local verification failed: API=${expected.join(',')} filesystem=${actual.join(',')}`);
  }
  return expected;
}

// Whole-meeting deletion is eventually consistent: Zoom returns success while
// the meeting endpoint still lists files. Poll until it 404s so a retry never
// refetches aliases of files that are already gone.
export async function deleteMeeting(config, meetingId, { polls = 6, intervalMs = 15000 } = {}) {
  await retry(() => zoomApi(zoomAuth(config), `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`, { method: 'DELETE' }));
  for (let attempt = 1; ; attempt++) {
    try {
      const current = await zoomApi(zoomAuth(config), `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`);
      const remaining = [...(current.recording_files ?? []), ...(current.participant_audio_files ?? [])];
      if (!remaining.length) return { deleted: true, polls: attempt };
    } catch (error) {
      if (error.status === 404) return { deleted: true, polls: attempt };
    }
    if (attempt >= polls) throw new Error(`Meeting ${meetingId} still lists files after whole-meeting delete`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}
