import { loadConfig } from './config.mjs';
import { ActivityRepository } from './repository.mjs';
import { ActivityService } from './activities.mjs';
import { createProcessor } from './processor.mjs';
import { createApplication } from './application.mjs';

const config=loadConfig();
const repository=new ActivityRepository(config.eventsDatabasePath);
const activities=new ActivityService(repository);
activities.recover();
const {callback,admin}=createApplication(config,activities,createProcessor(config));
for(const server of [callback,admin]) server.on('error',error=>{
  console.error(JSON.stringify({event:'listener_failed',code:error.code}));process.exit(1);
});
callback.listen(config.port,config.host,()=>console.log(`Zoom callback listening on http://${config.host}:${config.port}/zoom/transcripts`));
admin.listen(config.eventsPort,'127.0.0.1',()=>console.log(`Server events at http://127.0.0.1:${config.eventsPort}/events`));

// Stop accepting callbacks, then allow running jobs to finish before a clean restart.
let stopping=false;
function shutdown(){
  if(stopping)return;stopping=true;
  callback.close();admin.close();
  const timer=setInterval(()=>{
    if(repository.unfinished().length)return;
    clearInterval(timer);repository.close();process.exit(0);
  },250);
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
