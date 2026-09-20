#!/usr/bin/env node
// Download one meeting's recording assets into the iCloud Zoom folder.
// Usage: node scripts/zoom-download.mjs --meeting <meetingId> [--dir <dest>]
//   Default dest: John's Stuff/Zoom/<date> <topic>/
//   With --delete (double opt-in: also --yes): delete the cloud recording after verifying downloads.
import { mkdirSync, createWriteStream, statSync } from "node:fs";
import { join, basename } from "node:path";
import { pipeline } from "node:stream/promises";
import { loadConfig } from "../src/config.mjs";
import { zoomApi } from "../src/zoomOAuth.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const idx = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (idx === -1) return fallback;
  const hit = args[idx];
  if (hit.includes("=")) return hit.split("=").slice(1).join("=");
  const next = args[idx + 1];
  return next && !next.startsWith("--") ? next : true;
};

const meetingId = flag("--meeting");
if (!meetingId) {
  console.error("Usage: node scripts/zoom-download.mjs --meeting <meetingId> [--dir <dest>] [--delete --yes]");
  process.exit(1);
}
const wantDelete = Boolean(flag("--delete"));
const confirmed = Boolean(flag("--yes"));
if (wantDelete && !confirmed) {
  console.error("Refusing: --delete requires --yes (downloaded files are verified first, then the cloud copy is deleted)");
  process.exit(1);
}

const config = loadConfig();
const auth = {
  clientId: config.zoomClientId,
  clientSecret: config.zoomClientSecret,
  tokenUrl: config.zoomTokenUrl,
  storePath: config.zoomOAuthStorePath,
};
if (!auth.clientId || !auth.clientSecret) {
  console.error("Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in .env, then connect via /zoom/oauth");
  process.exit(1);
}

const { loadStoredTokens } = await import("../src/zoomOAuth.mjs");
const tokens = loadStoredTokens(auth.storePath);
if (!tokens?.access_token) {
  console.error("No stored Zoom tokens; open the app authorize URL and approve first");
  process.exit(1);
}

const meeting = await zoomApi(auth, `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`);
const date = (meeting.start_time ?? "").slice(0, 10);
const safeTopic = (meeting.topic ?? "Zoom meeting").replace(/[\\/:*?"<>|#[\]]/g, "-").replace(/\s+/g, " ").trim();
const dest = flag("--dir") ?? join("/Users/johnberryman/Library/Mobile Documents/com~apple~CloudDocs/John's Stuff/Zoom", `${date} ${safeTopic}`);
mkdirSync(dest, { recursive: true });

const extFor = (file) => file.file_extension?.toLowerCase()
  ?? ({ MP4: "mp4", M4A: "m4a", TRANSCRIPT: "vtt", CC: "vtt", CHAT: "txt", CSV: "csv" }[file.file_type] ?? "bin");

let failures = 0;
for (const file of meeting.recording_files ?? []) {
  if (file.status !== "completed") {
    console.log(`skip ${file.id} (${file.file_type}): status ${file.status}`);
    continue;
  }
  const ext = extFor(file);
  const name = `${file.file_type.toLowerCase()}${file.recording_type && file.recording_type !== file.file_type ? `-${file.recording_type.toLowerCase()}` : ""}.${ext}`;
  const target = join(dest, name);
  try {
    const response = await fetch(file.download_url, { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(response.body, createWriteStream(target));
    console.log(`saved ${name} (${statSync(target).size} bytes)`);
  } catch (error) {
    failures += 1;
    console.error(`FAILED ${file.id} (${file.file_type}): ${error.message}`);
  }
}

if (failures) {
  console.error(`${failures} file(s) failed; cloud copy left untouched`);
  process.exit(1);
}

if (wantDelete) {
  await zoomApi(auth, `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`, { method: "DELETE" });
  console.log(`deleted cloud recording for meeting ${meetingId} (local copies verified in ${dest})`);
} else {
  console.log(`done → ${dest}`);
  console.log(`basename: ${basename(dest)}`);
}
