import test from "node:test";
import assert from "node:assert/strict";
import { readPromptFile } from "../src/config.mjs";


test("loads the prompt while excluding its documentation comments", () => {
  const prompt = readPromptFile(new URL("../prompts/zoom-transcript.md", import.meta.url));
  assert.match(prompt, /Process the transcript/);
  assert.doesNotMatch(prompt, /Available variables/);
  assert.doesNotMatch(prompt, /developers\.zoom\.us/);
});

test("provides the example prompt and complete placeholder reference", async () => {
  const example = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../prompts/zoom-transcript.example.md", import.meta.url), "utf8"));
  for (const variable of [
    "event", "eventTimestamp", "accountId", "meetingUuid", "meetingId", "topic", "meetingType",
    "hostId", "hostEmail", "startTime", "timezone", "duration", "totalSize", "recordingCount",
    "shareUrl", "onPrem", "participantAudioFileNames", "recordingFileId", "recordingMeetingId", "recordingFileName",
    "recordingStart", "recordingEnd", "recordingFileType", "recordingFileExtension", "recordingFileSize",
    "recordingPlayUrl", "recordingDownloadUrl", "recordingStatus", "recordingType", "downloadUrl", "downloadToken",
  ]) {
    assert.match(example, new RegExp(`{{${variable}}}`));
  }
});
