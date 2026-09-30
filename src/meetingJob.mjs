import { randomUUID } from 'node:crypto';
import { createProcessor } from './processor.mjs';
import { getRecordingIndex, ensureLocal, archiveMedia } from './assetArchive.mjs';
import { transcriptDetails } from './zoom.mjs';
import { appendJsonLine } from './pi.mjs';

export function createMeetingJob(config, dependencies = {}) {
  const getIndex = dependencies.getIndex ?? getRecordingIndex;
  const local = dependencies.ensureLocal ?? ensureLocal;
  const archive = dependencies.archiveMedia ?? archiveMedia;
  return async function processMeeting(meetingId, requestId = randomUUID()) {
    const index = await getIndex(config, meetingId);
    const details = transcriptDetails({ event: 'recording.transcript_completed', object: index.meeting });
    details.meetingId = String(meetingId);
    const processTranscript = async () => {
      const transcriptPath = await local(config, index, index.transcript);
      const assets = { directory: index.directory, transcriptPath, files: [index.transcript] };
      const agent = dependencies.agent ?? createProcessor(config);
      return agent(details, requestId, assets);
    };
    const [transcriptResult, mediaResult] = await Promise.allSettled([processTranscript(), archive(config, index)]);
    const transcript = transcriptResult.status === 'fulfilled' ? transcriptResult.value : { status: 'failed', error: transcriptResult.reason.message, metadata: {} };
    const media = mediaResult.status === 'fulfilled' ? mediaResult.value : [{ status: 'failed', error: mediaResult.reason.message }];
    const mediaStatus = media.some(item => item.status === 'failed') ? 'failed' : 'succeeded';
    const result = { ...transcript, metadata: { ...transcript.metadata, meetingId: String(meetingId), topic: details.topic, mediaStatus, media, deletedAssets: media.filter(item => item.deleted).length } };
    if (config.piLogPath) appendJsonLine(config.piLogPath, { event: 'meeting_finished', requestId, ...result });
    return result;
  };
}
