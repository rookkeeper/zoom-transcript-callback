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

test("extracts the meeting ID and metadata without requiring callback download fields", () => {
  const details = transcriptDetails({
    event: "recording.transcript_completed",
    object: {
      id: 123,
      uuid: "uuid",
      topic: "Topic",
      participant_audio_files: [
        { file_name: "Audio only - Elisa L" },
        { file_name: "Audio only - John B" },
      ],
    },
  });
  assert.equal(details.meetingId, "123");
  assert.equal(details.topic, "Topic");
  assert.equal(details.participantAudioFileNames, "Audio only - Elisa L, Audio only - John B");
});

test("requires a meeting ID", () => {
  assert.throws(() => transcriptDetails({ object: {} }), /meeting ID/);
});
