import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { loadStoredTokens, zoomApi } from "./zoomOAuth.mjs";

export const DEFAULT_ZOOM_ROOT = "/Users/johnberryman/Library/Mobile Documents/com~apple~CloudDocs/John's Stuff/Zoom";

export function zoomAuth(config) {
  return { clientId: config.zoomClientId, clientSecret: config.zoomClientSecret, tokenUrl: config.zoomTokenUrl, storePath: config.zoomOAuthStorePath };
}

export function safeTopic(topic) {
  return (topic ?? "Zoom meeting").replace(/[\\/:*?"<>|#[\]]/g, "-").replace(/\s+/g, " ").trim();
}

export function recordingExtension(file) {
  return file.file_extension?.toLowerCase() ?? ({ MP4: "mp4", M4A: "m4a", TRANSCRIPT: "vtt", CC: "vtt", CHAT: "txt", CSV: "csv" }[file.file_type] ?? "bin");
}

export function recordingName(file) {
  const ext = recordingExtension(file);
  return `${file.file_type.toLowerCase()}${file.recording_type && file.recording_type !== file.file_type ? `-${file.recording_type.toLowerCase()}` : ""}.${ext}`;
}

export async function downloadMeetingAssets(config, meetingId, { directory, onTranscriptReady, deleteAssets = false } = {}) {
  const auth = zoomAuth(config);
  if (!auth.clientId || !auth.clientSecret) throw new Error("Zoom OAuth is not configured; set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET");
  const meeting = await zoomApi(auth, `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`);
  const destination = directory ?? join(DEFAULT_ZOOM_ROOT, `${(meeting.start_time ?? "").slice(0, 10)} ${safeTopic(meeting.topic)}`);
  mkdirSync(destination, { recursive: true });
  const tokens = loadStoredTokens(auth.storePath);
  if (!tokens?.access_token) throw new Error("No stored Zoom tokens; authorize the General app first");

  const recordingFiles = meeting.recording_files ?? [];
  const transcript = recordingFiles.find(file => file.status === "completed" && (file.file_type === "TRANSCRIPT" || file.recording_type === "audio_transcript"));
  if (!transcript) throw new Error(`Meeting ${meetingId} has no completed transcript`);
  const transcriptDownload = await downloadFile(transcript, destination, tokens.access_token);
  const transcriptPath = transcriptDownload.filePath;
  const initial = { meeting, directory: destination, transcriptPath, files: [{ id: transcript.id, name: recordingName(transcript), status: transcript.status, action: initialAction(transcriptPath) }], basename: basename(destination) };
  onTranscriptReady?.(initial);

  const files = [];
  for (const file of recordingFiles) {
    if (file === transcript) continue;
    if (file.status !== "completed") {
      files.push({ id: file.id, name: recordingName(file), status: file.status, action: "skipped" });
      continue;
    }
    const path = await downloadFile(file, destination, tokens.access_token);
    files.push({ id: file.id, name: recordingName(file), status: file.status, action: path.reused ? "reused" : "downloaded", bytes: statSync(path.filePath).size });
  }

  const expected = recordingFiles.filter(file => file.status === "completed").map(recordingName).sort();
  const actual = recordingFiles.filter(file => file.status === "completed").map(recordingName).filter(name => existsSync(join(destination, name)) && statSync(join(destination, name)).size > 0).sort();
  if (expected.join("\n") !== actual.join("\n")) throw new Error(`Zoom asset verification failed: API=${expected.join(",")} filesystem=${actual.join(",")}`);

  const deletions = [];
  if (deleteAssets) {
    for (const file of recordingFiles) {
      if (file === transcript || file.status !== "completed") continue;
      await zoomApi(auth, `/v2/meetings/${encodeURIComponent(meetingId)}/recordings/${encodeURIComponent(file.id)}`, { method: "DELETE" });
      deletions.push({ id: file.id, name: recordingName(file) });
    }
  }
  return { ...initial, files: [...initial.files, ...files], verified: true, deleted: deletions };
}

async function downloadFile(file, destination, accessToken) {
  const name = recordingName(file);
  const filePath = join(destination, name);
  if (existsSync(filePath) && statSync(filePath).size > 0) return { filePath, reused: true };
  const response = await fetch(file.download_url, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10 * 60 * 1000) });
  if (!response.ok || !response.body) throw new Error(`Asset ${name} download failed: HTTP ${response.status}`);
  await pipeline(response.body, createWriteStream(filePath));
  return { filePath, reused: false };
}

function initialAction(path) { return existsSync(path) && statSync(path).size > 0 ? "ready" : "downloaded"; }
