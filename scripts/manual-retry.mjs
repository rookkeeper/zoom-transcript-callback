#!/usr/bin/env node
// Manual retry of a failed transcript job. Reuses the server's own config +
// processor so the retry is identical to a live callback, except:
//  - a fresh activity row tracks the retry (method MANUAL_RETRY, retryOf set)
//  - the Zoom download token is blank; the prompt reuses the valid
//    zoom-transcript.vtt already downloaded into a fresh job directory.
// Usage: node scripts/manual-retry.mjs <failedRequestId>
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync } from "node:fs";
import { loadConfig } from "../src/config.mjs";
import { ActivityService } from "../src/activities.mjs";
import { ActivityRepository } from "../src/repository.mjs";
import { createProcessor } from "../src/processor.mjs";
import { jobDirectory } from "../src/pi.mjs";

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
    recordingFileId: originalMeta.recordingFileId ?? "",
    model: config.piModel || "default",
  },
});

// Carry the already-downloaded transcript into the fresh job dir so the
// retry does not need a (now expired) Zoom download token.
const oldJobDir = jobDirectory(config.piWorkRoot, failedId);
const oldVtt = `${oldJobDir}/zoom-transcript.vtt`;
const newJobDir = jobDirectory(config.piWorkRoot, retryId);
if (existsSync(oldVtt)) copyFileSync(oldVtt, `${newJobDir}/zoom-transcript.vtt`);

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
  recordingFileId: originalMeta.recordingFileId ?? "",
  recordingMeetingId: "",
  recordingFileName: "",
  recordingStart: "",
  recordingEnd: "",
  recordingFileType: "",
  recordingFileExtension: "",
  recordingFileSize: "",
  recordingPlayUrl: "",
  recordingDownloadUrl: "",
  recordingStatus: "",
  downloadUrl: "",
  downloadToken: "",
};

console.log(JSON.stringify({ event: "manual_retry_started", retryId, retryOf: failedId, title: original.title }));
await activities.run(retryId, () => processor(details, retryId));
const done = activities.get(retryId);
console.log(JSON.stringify({ event: "manual_retry_finished", retryId, status: done.status, error: done.error }));
process.exit(done.status === "succeeded" ? 0 : 1);
