import test from "node:test";
import assert from "node:assert/strict";
import { validationResponse, verifyZoomSignature, transcriptDetails, zoomSignature } from "../src/zoom.mjs";

const secret = "test-secret";
const body = JSON.stringify({ event: "recording.transcript_completed", payload: {} });

test("verifies a fresh Zoom signature", () => {
  const timestamp = "1700000000";
  const signature = zoomSignature(secret, timestamp, body);
  assert.equal(verifyZoomSignature({ secret, timestamp, signature, rawBody: body, nowSeconds: 1700000100 }), true);
});

test("rejects stale and invalid signatures", () => {
  const timestamp = "1700000000";
  const signature = zoomSignature(secret, timestamp, body);
  assert.equal(verifyZoomSignature({ secret, timestamp, signature, rawBody: body, nowSeconds: 1700000401 }), false);
  assert.equal(verifyZoomSignature({ secret, timestamp, signature: "v0=bad", rawBody: body, nowSeconds: 1700000001 }), false);
});

test("creates the Zoom validation response", () => {
  const response = validationResponse(secret, "plain-token");
  assert.equal(response.plainToken, "plain-token");
  assert.match(response.encryptedToken, /^[0-9a-f]{64}$/);
});

test("selects the transcript recording file", () => {
  const details = transcriptDetails({
    download_token: "temporary",
    object: {
      id: 123,
      uuid: "uuid",
      topic: "Topic",
      participant_audio_files: [
        { file_name: "Audio only - Elisa L" },
        { file_name: "Audio only - John B" },
      ],
      recording_files: [
        { file_type: "MP4", download_url: "video" },
        { file_type: "TRANSCRIPT", recording_type: "audio_transcript", download_url: "transcript" },
      ],
    },
  });
  assert.equal(details.downloadUrl, "transcript");
  assert.equal(details.downloadToken, "temporary");
  assert.equal(details.participantAudioFileNames, "Audio only - Elisa L, Audio only - John B");
});

test("requires a downloadable transcript", () => {
  assert.throws(() => transcriptDetails({ object: { recording_files: [] } }), /downloadable transcript/);
});
