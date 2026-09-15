import { adminServer } from '../src/admin.mjs';
import { ActivityRepository } from '../src/repository.mjs';
import { ActivityService } from '../src/activities.mjs';
const service=new ActivityService(new ActivityRepository(':memory:'));
for(let i=0;i<55;i++){
  const row=service.receive({id:`event-${i}`,endpoint:i%2?'/zoom/transcripts':'/future',type:i%2?'zoom':'future',title:`Meeting ${i}: a long title to exercise wrapping in the events table`,metadata:{nested:{people:['John','Tom'],value:'<script>alert(1)</script>'}}});
  if(i%5){service.start(row.id);if(i%5>1)service.finish(row.id,['succeeded','failed','incomplete'][i%5-2],{summary:'Fixture result'});}
}
adminServer(service).listen(18788,'127.0.0.1');
