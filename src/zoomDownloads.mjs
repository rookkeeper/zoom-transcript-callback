import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { loadStoredTokens, zoomApi } from "./zoomOAuth.mjs";

export const DEFAULT_ZOOM_ROOT = "/Users/johnberryman/Library/Mobile Documents/com~apple~CloudDocs/John's Stuff/Zoom";

export function zoomAuth(config) {
  return {
    clientId: config.zoomClientId,
    clientSecret: config.zoomClientSecret,
    tokenUrl: config.zoomTokenUrl,
    storePath: config.zoomOAuthStorePath,
  };
}

export function safeTopic(topic) {
  return (topic ?? "Zoom meeting")
    .replace(/[\\/:*?"<>|#[\]]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function recordingExtension(file) {
  return file.file_extension?.toLowerCase()
    ?? ({ MP4: "mp4", M4A: "m4a", TRANSCRIPT: "vtt", CC: "vtt", CHAT: "txt", CSV: "csv" }[file.file_type] ?? "bin");
}

export function recordingName(file) {
  const ext = recordingExtension(file);
  return `${file.file_type.toLowerCase()}${file.recording_type && file.recording_type !== file.file_type ? `-${file.recording_type.toLowerCase()}` : ""}.${ext}`;
}

export async function downloadMeetingAssets(config, meetingId, { directory } = {}) {
  const auth = zoomAuth(config);
  if (!auth.clientId || !auth.clientSecret) throw new Error("Zoom OAuth is not configured; set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET");

  const meeting = await zoomApi(auth, `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`);
  const destination = directory ?? join(DEFAULT_ZOOM_ROOT, `${(meeting.start_time ?? "").slice(0, 10)} ${safeTopic(meeting.topic)}`);
  mkdirSync(destination, { recursive: true });

  const tokens = loadStoredTokens(auth.storePath);
  if (!tokens?.access_token) throw new Error("No stored Zoom tokens; authorize the General app first");

  let transcriptPath = null;
  const files = [];
  const failures = [];
  for (const file of meeting.recording_files ?? []) {
    if (file.file_type === "TRANSCRIPT" || file.recording_type === "audio_transcript") {
      transcriptPath = join(destination, recordingName(file));
    }
    if (file.status !== "completed") {
      files.push({ id: file.id, name: recordingName(file), status: file.status, action: "skipped" });
      continue;
    }

    const name = recordingName(file);
    const target = join(destination, name);
    if (existsSync(target) && statSync(target).size > 0) {
      files.push({ id: file.id, name, status: file.status, action: "reused", bytes: statSync(target).size });
      continue;
    }

    try {
      const response = await fetch(file.download_url, {
        headers: { authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(10 * 60 * 1000),
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(response.body, createWriteStream(target));
      files.push({ id: file.id, name, status: file.status, action: "downloaded", bytes: statSync(target).size });
    } catch (error) {
      failures.push(`${file.id} (${file.file_type}): ${error.message}`);
    }
  }

  if (failures.length) throw new Error(`Zoom asset download failed: ${failures.join("; ")}`);
  if (!transcriptPath || !existsSync(transcriptPath) || statSync(transcriptPath).size === 0) {
    throw new Error(`Meeting ${meetingId} has no completed transcript in ${destination}`);
  }

  return {
    meeting,
    directory: destination,
    transcriptPath,
    files,
    basename: basename(destination),
  };
}
