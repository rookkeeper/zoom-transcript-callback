import { createApplication } from '../src/application.mjs';
import { createLiveHandlers } from '../live/server.mjs';
import { TranscriptState } from '../live/state.mjs';
import { ActivityRepository } from '../src/repository.mjs';
import { ActivityService } from '../src/activities.mjs';
const service=new ActivityService(new ActivityRepository(':memory:'));
for(let i=0;i<55;i++){
  const row=service.receive({id:`event-${i}`,endpoint:i%2?'/zoom/transcripts':'/future',type:i%2?'zoom':'future',title:`Meeting ${i}: a long title to exercise wrapping in the events table`,metadata:{nested:{people:['John','Tom'],value:'<script>alert(1)</script>'}}});
  if(i%5){service.start(row.id);if(i%5>1)service.finish(row.id,['succeeded','failed','incomplete'][i%5-2],{summary:'Fixture result'});}
}
const state=new TranscriptState();
state.append({user_id:1,user_name:'Synthetic Alex',timestamp:1,data:'Synthetic shared-server live text'});
state.setStatus('live');
const live=createLiveHandlers({webhookSecret:'fake',state,controller:{handle(){},async close(){}}});
const app=createApplication({zoomSecret:'fake',maxBodyBytes:10000,maxTimestampAgeSeconds:300},service,async()=>{throw new Error('No recording processing in fixture');},{live});
app.server.listen(18788,'127.0.0.1');
process.on('SIGTERM',async()=>{await app.close();process.exit(0);});
