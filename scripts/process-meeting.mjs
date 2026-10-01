#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../src/config.mjs';
import { ActivityService } from '../src/activities.mjs';
import { ActivityRepository } from '../src/repository.mjs';
import { createMeetingJob } from '../src/meetingJob.mjs';
const meetingUuid = process.argv[2];
if (!meetingUuid) throw new Error('Usage: node scripts/process-meeting.mjs <meetingUuid>');
const config = loadConfig();
const repository = new ActivityRepository(config.eventsDatabasePath);
const activities = new ActivityService(repository);
const id = randomUUID();
activities.receive({ id, endpoint: 'manual://process-meeting', type: 'recording.transcript_completed', title: `Zoom meeting ${meetingUuid}`, metadata: { meetingUuid, method: 'MANUAL_MEETING_UUID' } });
const result = await activities.run(id, async () => {
  const outcome = await createMeetingJob(config)(meetingUuid, id);
  if (outcome.metadata?.topic) activities.update(id, { title: outcome.metadata.topic });
  return outcome;
});
console.log(JSON.stringify(result));
repository.close();
process.exitCode = result.status === 'succeeded' && result.metadata.mediaStatus === 'succeeded' ? 0 : 1;
