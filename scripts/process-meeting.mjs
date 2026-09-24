#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { loadConfig } from "../src/config.mjs";
import { ActivityService } from "../src/activities.mjs";
import { ActivityRepository } from "../src/repository.mjs";
import { downloadMeetingAssets, safeTopic, zoomAuth } from "../src/zoomDownloads.mjs";
import { zoomApi } from "../src/zoomOAuth.mjs";
import { createProcessor } from "../src/processor.mjs";

const meetingId = process.argv[2];
if (!meetingId) {
  console.error("Usage: node scripts/process-meeting.mjs <meetingId>");
  process.exit(2);
}
const config = loadConfig();
const meeting = await zoomApi(zoomAuth(config), `/v2/meetings/${encodeURIComponent(meetingId)}/recordings`);
const folder = join(
  "/Users/johnberryman/Library/Mobile Documents/com~apple~CloudDocs/John's Stuff/Zoom",
  `${(meeting.start_time ?? "").slice(0, 10)} ${safeTopic(meeting.topic)} [${meetingId}]`,
);
config.downloadAssets = (id, options = {}) => downloadMeetingAssets(config, id, { ...options, directory: folder, deleteAssets: true });
const repository = new ActivityRepository(config.eventsDatabasePath);
const activities = new ActivityService(repository);
const processor = createProcessor(config);
const id = randomUUID();
activities.receive({ id, endpoint: "manual://process-meeting", type: "recording.transcript_completed", title: meeting.topic, metadata: { meetingId: String(meetingId), method: "MANUAL_MEETING_ID" } });
const details = {
  event: "recording.transcript_completed", eventTimestamp: "", accountId: "", meetingUuid: meeting.uuid ?? "", meetingId: String(meeting.id ?? meetingId),
  topic: meeting.topic ?? "Zoom meeting", meetingType: meeting.type ?? "", hostId: meeting.host_id ?? "", hostEmail: meeting.host_email ?? "",
  startTime: meeting.start_time ?? "", timezone: meeting.timezone ?? "", duration: meeting.duration ?? "", totalSize: meeting.total_size ?? "",
  recordingCount: meeting.recording_count ?? "", shareUrl: meeting.share_url ?? "", onPrem: meeting.on_prem ?? "", participantAudioFileNames: "",
};
console.log(JSON.stringify({ event: "meeting_processing_started", meetingId, title: details.topic, folder }));
await activities.run(id, () => processor(details, id));
const result = activities.get(id);
console.log(JSON.stringify({ event: "meeting_processing_finished", meetingId, activityId: id, status: result.status, error: result.error }));
process.exit(result.status === "succeeded" ? 0 : 1);
