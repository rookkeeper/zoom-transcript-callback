import { randomUUID } from 'node:crypto';
import { createProcessor } from './processor.mjs';
import { listAssets, downloadAsset, downloadMedia, verifyLocal, deleteMeeting } from './assetArchive.mjs';
import { transcriptDetails } from './zoom.mjs';
import { appendJsonLine } from './pi.mjs';

// One meeting in, everything out: download every completed asset starting
// with the transcript, process the transcript as soon as it lands, and once
// every asset verifies locally, delete the whole meeting from Zoom — no
// per-file deletion round-trips.
export function createMeetingJob(config, dependencies = {}) {
  const list = dependencies.listAssets ?? listAssets;
  const fetchOne = dependencies.downloadAsset ?? downloadAsset;
  const fetchMedia = dependencies.downloadMedia ?? downloadMedia;
  const confirm = dependencies.verifyLocal ?? verifyLocal;
  const remove = dependencies.deleteMeeting ?? deleteMeeting;
  return async function processMeeting(meetingId, requestId = randomUUID()) {
    const index = await list(config, meetingId);
    const details = transcriptDetails({ event: 'recording.transcript_completed', object: index.meeting });
    details.meetingId = String(meetingId);

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
      const result = { ...transcriptResult, metadata: { ...transcriptResult.metadata, meetingId: String(meetingId), topic: details.topic, media, deletedMeeting: false }, error: errors.join('; ') };
      if (config.piLogPath) appendJsonLine(config.piLogPath, { event: 'meeting_finished', requestId, ...result });
      return result;
    }

    confirm(index);
    const deletion = await remove(config, meetingId);
    const result = { ...transcriptResult, metadata: { ...transcriptResult.metadata, meetingId: String(meetingId), topic: details.topic, media, deletedMeeting: deletion.deleted, deletePolls: deletion.polls } };
    if (config.piLogPath) appendJsonLine(config.piLogPath, { event: 'meeting_finished', requestId, ...result });
    return result;
  };
}
