import { loadConfig } from './config.mjs';
import { ActivityRepository } from './repository.mjs';
import { ActivityService } from './activities.mjs';
import { createMeetingJob } from './meetingJob.mjs';
import { createApplication } from './application.mjs';
import { TranscriptState } from '../live/state.mjs';
import { RtmsController } from '../live/rtms.mjs';
import { createLiveHandlers } from '../live/server.mjs';

const config = loadConfig();
const repository = new ActivityRepository(config.eventsDatabasePath);
const activities = new ActivityService(repository);
activities.recover();
const state = new TranscriptState();
const controller = new RtmsController({ clientId: config.zoomClientId, clientSecret: config.zoomClientSecret, state });
const live = createLiveHandlers({ webhookSecret: config.zoomSecret, state, controller });
const app = createApplication(config, activities, createMeetingJob(config), { live });
app.server.on('error', error => {
  console.error(JSON.stringify({ event: 'listener_failed', code: error.code })); process.exit(1);
});
app.server.listen(config.port, config.host, () => console.log(`Zoom server :${config.port}; local http://127.0.0.1:${config.port}/events and /live`));

let stopping = false;
function shutdown() {
  if (stopping) return; stopping = true;
  const closed = app.close();
  const timer = setInterval(async () => {
    if (repository.unfinished().length) return;
    clearInterval(timer); await closed; repository.close(); process.exit(0);
  }, 250);
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
