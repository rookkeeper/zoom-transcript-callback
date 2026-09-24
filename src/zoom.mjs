import { createHmac, timingSafeEqual } from "node:crypto";

export function zoomSignature(secret, timestamp, rawBody) {
  const message = `v0:${timestamp}:${rawBody}`;
  return `v0=${createHmac("sha256", secret).update(message).digest("hex")}`;
}

export function verifyZoomSignature({ secret, timestamp, signature, rawBody, nowSeconds = Math.floor(Date.now() / 1000), maxAgeSeconds = 300 }) {
  if (!/^\d+$/.test(timestamp ?? "") || !signature) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > maxAgeSeconds) return false;
  const expected = Buffer.from(zoomSignature(secret, timestamp, rawBody));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function validationResponse(secret, plainToken) {
  return {
    plainToken,
    encryptedToken: createHmac("sha256", secret).update(plainToken).digest("hex"),
  };
}

export function transcriptDetails(payload) {
  const meeting = payload?.payload?.object ?? payload?.object;
  if (!meeting || typeof meeting !== "object") throw new Error("Missing Zoom meeting object");
  if (meeting.id == null) throw new Error("Zoom payload has no meeting ID");

  return {
    event: text(payload.event),
    eventTimestamp: text(payload.event_ts),
    accountId: text(payload.payload?.account_id ?? meeting.account_id),
    meetingUuid: text(meeting.uuid),
    meetingId: text(meeting.id),
    topic: text(meeting.topic, "Zoom meeting"),
    meetingType: text(meeting.type),
    hostId: text(meeting.host_id),
    hostEmail: text(meeting.host_email),
    startTime: text(meeting.start_time),
    timezone: text(meeting.timezone),
    duration: text(meeting.duration),
    totalSize: text(meeting.total_size),
    recordingCount: text(meeting.recording_count),
    shareUrl: text(meeting.share_url),
    onPrem: text(meeting.on_prem),
    participantAudioFileNames: Array.isArray(meeting.participant_audio_files)
      ? meeting.participant_audio_files.map((file) => file?.file_name).filter(Boolean).join(", ")
      : "",
  };
}

function text(value, fallback = "") {
  return value == null ? fallback : String(value);
}
