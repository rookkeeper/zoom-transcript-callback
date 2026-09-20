#!/usr/bin/env node
// List cloud recordings and their downloadable assets.
// Usage: node scripts/zoom-list.mjs [--json] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--user me]
// Prints one line per recording file: meeting date, topic, file type, size.
import { loadConfig } from "../src/config.mjs";
import { zoomApi } from "../src/zoomOAuth.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = args.find((arg) => arg === name || arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  return hit.includes("=") ? hit.split("=").slice(1).join("=") : true;
};

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

const userId = flag("--user", "me");
const params = new URLSearchParams({ page_size: "100" });
if (flag("--from")) params.set("from", flag("--from"));
if (flag("--to")) params.set("to", flag("--to"));

const asJson = Boolean(flag("--json"));
const meetings = await zoomApi(auth, `/v2/users/${encodeURIComponent(userId)}/recordings?${params}`);
const rows = [];
for (const meeting of meetings.meetings ?? []) {
  const files = await zoomApi(auth, `/v2/meetings/${meeting.id}/recordings`);
  for (const file of files.recording_files ?? []) {
    rows.push({
      start: meeting.start_time,
      topic: meeting.topic,
      meetingId: meeting.id,
      uuid: meeting.uuid,
      fileId: file.id,
      fileType: file.file_type,
      recordingType: file.recording_type,
      status: file.status,
      size: file.file_size,
      downloadUrl: file.download_url,
    });
  }
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else if (!rows.length) {
  console.log("No recording files found.");
} else {
  for (const row of rows) {
    console.log(`${row.start ?? "?"} | ${row.topic} | ${row.fileType}${row.recordingType ? `/${row.recordingType}` : ""} | ${row.size ?? "?"} bytes | ${row.status}`);
  }
}
