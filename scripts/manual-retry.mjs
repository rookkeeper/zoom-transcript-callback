#!/usr/bin/env node
// Retry a meeting by retrieving its assets from Zoom again.
// Usage: node scripts/manual-retry.mjs <meetingId>
import { randomUUID } from "node:crypto";
import { loadConfig } from "../src/config.mjs";
import { ActivityService } from "../src/activities.mjs";
import { ActivityRepository } from "../src/repository.mjs";
import { createMeetingJob } from "../src/meetingJob.mjs";

const meetingId = process.argv[2];
if (!meetingId) {
  console.error("Usage: node scripts/manual-retry.mjs <meetingId>");
  process.exit(1);
}

const config = loadConfig();
const repository = new ActivityRepository(config.eventsDatabasePath);
const activities = new ActivityService(repository);
const processor = createMeetingJob(config);
const original = activities.list().find(row => {
  const metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata ?? {});
  return metadata.meetingId === meetingId && ['failed', 'incomplete'].includes(row.status);
});
if (!original) {
  console.error(`No failed or incomplete activity found for meeting ${meetingId}`);
  process.exit(1);
}
const failedId = original.id;

const originalMeta = typeof original.metadata === "string" ? JSON.parse(original.metadata) : (original.metadata ?? {});
const retryId = randomUUID();
activities.receive({
  id: retryId,
  endpoint: original.endpoint,
  type: original.type,
  title: original.title,
  metadata: {
    method: "MANUAL_RETRY",
    retryOf: failedId,
    meetingId,
    meetingUuid: originalMeta.meetingUuid ?? "",
    model: config.piModel || "default",
  },
});

const details = {
  event: "recording.transcript_completed",
  eventTimestamp: "",
  accountId: "",
  meetingUuid: originalMeta.meetingUuid ?? "",
  meetingId,
  topic: original.title,
  meetingType: "",
  hostId: "",
  hostEmail: "",
  startTime: "",
  timezone: "",
  duration: "",
  totalSize: "",
  recordingCount: "",
  shareUrl: "",
  onPrem: "",
  participantAudioFileNames: "",
};

console.log(JSON.stringify({ event: "manual_retry_started", retryId, retryOf: failedId, title: original.title }));
await activities.run(retryId, () => processor(meetingId, retryId));
const done = activities.get(retryId);
console.log(JSON.stringify({ event: "manual_retry_finished", retryId, status: done.status, error: done.error }));
process.exit(done.status === "succeeded" ? 0 : 1);
