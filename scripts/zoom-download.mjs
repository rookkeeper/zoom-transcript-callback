#!/usr/bin/env node
// Download every completed asset for one Zoom meeting instance.
// Usage: node scripts/zoom-download.mjs --meeting <meetingUuid> [--dir <dest>] [--delete --yes]
// The UUID selects the exact recording instance; a numeric ID lists whichever
// instance Zoom returns for it and cannot disambiguate repeated IDs.
import { loadConfig } from "../src/config.mjs";
import { downloadMeetingAssets } from "../src/zoomDownloads.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const idx = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (idx === -1) return fallback;
  const hit = args[idx];
  if (hit.includes("=")) return hit.split("=").slice(1).join("=");
  const next = args[idx + 1];
  return next && !next.startsWith("--") ? next : true;
};

const meetingKey = flag("--meeting");
if (!meetingKey) {
  console.error("Usage: node scripts/zoom-download.mjs --meeting <meetingUuid> [--dir <dest>] [--delete --yes]");
  process.exit(1);
}
const wantDelete = Boolean(flag("--delete"));
if (wantDelete && !flag("--yes")) {
  console.error("Refusing: --delete requires --yes (downloaded files are verified first, then the cloud copy is deleted)");
  process.exit(1);
}

const config = loadConfig();
const result = await downloadMeetingAssets(config, meetingKey, {
  directory: flag("--dir") ?? undefined,
  deleteAssets: wantDelete,
});
for (const file of result.files) {
  console.log(`${file.action} ${file.name}${file.bytes ? ` (${file.bytes} bytes)` : ""}`);
}

if (wantDelete) console.log(`deleted ${result.deleted.length} cloud assets, preserved transcript (local copies verified in ${result.directory})`);
else console.log(`done → ${result.directory}`);
