#!/usr/bin/env node
// Retry a failed transcript job by retrieving the meeting's assets from Zoom again.
// Usage: node scripts/manual-retry.mjs <failedRequestId>
import { randomUUID } from "node:crypto";
import { loadConfig } from "../src/config.mjs";
import { ActivityService } from "../src/activities.mjs";
import { ActivityRepository } from "../src/repository.mjs";
import { createProcessor } from "../src/processor.mjs";

const failedId = process.argv[2];
if (!failedId) {
  console.error("Usage: node scripts/manual-retry.mjs <failedRequestId>");
  process.exit(1);
}

const config = loadConfig();
const repository = new ActivityRepository(config.eventsDatabasePath);
const activities = new ActivityService(repository);
const processor = createProcessor(config);
const original = activities.get(failedId);
if (!original) {
  console.error(`No activity found for ${failedId}`);
  process.exit(1);
}

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
    meetingId: originalMeta.meetingId ?? "",
    meetingUuid: originalMeta.meetingUuid ?? "",
    model: config.piModel || "default",
  },
});

const details = {
  event: "recording.transcript_completed",
  eventTimestamp: "",
  accountId: "",
  meetingUuid: originalMeta.meetingUuid ?? "",
  meetingId: originalMeta.meetingId ?? "",
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
await activities.run(retryId, () => processor(details, retryId));
const done = activities.get(retryId);
console.log(JSON.stringify({ event: "manual_retry_finished", retryId, status: done.status, error: done.error }));
process.exit(done.status === "succeeded" ? 0 : 1);
