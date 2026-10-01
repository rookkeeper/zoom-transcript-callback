import { randomUUID } from 'node:crypto';
import { createProcessor } from './processor.mjs';
import { listAssets, downloadTranscript, downloadAssets, verifyLocal, deleteMeeting } from './assetArchive.mjs';
import { transcriptDetails } from './zoom.mjs';
import { appendJsonLine } from './pi.mjs';

// One meeting instance in, everything out: the instance key is the meeting
// UUID from the webhook payload (or the stored activity metadata), never the
// numeric meeting ID. The numeric ID rides along in metadata for display only.
// Downloads the transcript first, processes it as soon as it lands, downloads
// the remaining assets in parallel, and once every asset verifies locally,
// deletes the whole instance from Zoom — never per-file deletion.
export function createMeetingJob(config, dependencies = {}) {
  const list = dependencies.listAssets ?? listAssets;
  const fetchOne = dependencies.downloadTranscript ?? downloadTranscript;
  const fetchMedia = dependencies.downloadAssets ?? downloadAssets;
  const confirm = dependencies.verifyLocal ?? verifyLocal;
  const remove = dependencies.deleteMeeting ?? deleteMeeting;
  return async function processMeeting(meetingUuid, requestId = randomUUID()) {
    const index = await list(config, meetingUuid);
    const details = transcriptDetails({ event: 'recording.transcript_completed', object: index.meeting });
    // The numeric ID stays in metadata for display/linking; the UUID is the
    // fetch/delete key. Prefer the API response but keep the stored value.
    if (!details.meetingUuid) details.meetingUuid = String(meetingUuid);
    details.meetingId = details.meetingId || (index.meetingId != null ? String(index.meetingId) : '');

    // The transcript downloads first; the agent starts as soon as it lands
    // while the remaining assets download in parallel with the agent run.
    const transcriptPath = await fetchOne(config, index, index.transcript);
    const assets = { directory: index.directory, transcriptPath, files: [index.transcript] };
    const agent = dependencies.agent ?? createProcessor(config);
    const [transcriptResult, mediaResult] = await Promise.all([agent(details, requestId, assets), fetchMedia(config, index)]);
    const failed = mediaResult.filter(item => item.status === 'failed');
    const media = mediaResult.map(item => ({ ...item, deleted: false }));
    if (transcriptResult.status !== 'succeeded' || failed.length) {
      const errors = [transcriptResult.error, ...failed.map(item => `${item.name ?? item.id}: ${item.error}`)].filter(Boolean);
      const result = { ...transcriptResult, metadata: { ...transcriptResult.metadata, meetingUuid: details.meetingUuid, meetingId: details.meetingId, topic: details.topic, media, deletedMeeting: false }, error: errors.join('; ') };
      if (config.piLogPath) appendJsonLine(config.piLogPath, { event: 'meeting_finished', requestId, ...result });
      return result;
    }

    confirm(index);
    const deletion = await remove(config, details.meetingUuid || String(meetingUuid));
    const result = { ...transcriptResult, metadata: { ...transcriptResult.metadata, meetingUuid: details.meetingUuid, meetingId: details.meetingId, topic: details.topic, media, deletedMeeting: deletion.deleted, deletePolls: deletion.polls } };
    if (config.piLogPath) appendJsonLine(config.piLogPath, { event: 'meeting_finished', requestId, ...result });
    return result;
  };
}
