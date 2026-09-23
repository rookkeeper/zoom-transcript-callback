import test from "node:test";
import assert from "node:assert/strict";
import { ZOOM_TRANSCRIPT_PROMPT } from "../src/zoomPrompt.mjs";


test("contains the internal Zoom transcript-processing prompt", () => {
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /how-to-use-this-repo/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /how-to-use-peeps-obsidian/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /Process the transcript/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /zoom-processing-result\.json/);
});

test("contains every webhook placeholder used by the processor", () => {
  for (const variable of [
    "repoSkillDirectory", "jobDirectory", "peepsSkillDirectory", "event", "eventTimestamp", "accountId",
    "meetingUuid", "meetingId", "topic", "meetingType", "hostId", "hostEmail", "startTime", "timezone",
    "duration", "totalSize", "recordingCount", "shareUrl", "onPrem", "participantAudioFileNames",
    "recordingFileId", "recordingMeetingId", "recordingFileName", "recordingStart", "recordingEnd",
    "recordingFileType", "recordingFileExtension", "recordingFileSize", "recordingPlayUrl",
    "recordingDownloadUrl", "recordingStatus", "recordingType", "downloadUrl", "downloadToken",
  ]) {
    assert.match(ZOOM_TRANSCRIPT_PROMPT, new RegExp(`{{${variable}}}`));
  }
});
