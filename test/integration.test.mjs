import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { createApplication } from '../src/application.mjs';
import { ActivityService } from '../src/activities.mjs';
import { ActivityRepository } from '../src/repository.mjs';
import { zoomSignature } from '../src/zoom.mjs';

test('signed callback is acknowledged before completion, queried locally, and protected from public ingress', async t=>{
  const repo=new ActivityRepository(':memory:');t.after(()=>repo.close());
  const service=new ActivityService(repo);
  let complete;
  const config={zoomSecret:'test',maxBodyBytes:10000,maxTimestampAgeSeconds:300,piModel:'test',eventsPort:0};
  const app=createApplication(config,service,()=>new Promise(resolve=>{complete=resolve;}));
  assert.ok(app.callback && app.admin,'Application must compose both listeners');
  for(const server of [app.callback,app.admin]){server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});}
  const publicUrl=`http://127.0.0.1:${app.callback.address().port}`,localUrl=`http://127.0.0.1:${app.admin.address().port}`;
  for(const path of ['/events','/api/events'])assert.equal((await fetch(publicUrl+path)).status,404);
  for(const headers of [{host:'public.example'},{'x-forwarded-host':'public.example'},{'cf-connecting-ip':'1.2.3.4'},{forwarded:'for=1.2.3.4'}]){
    const status=await new Promise((resolve,reject)=>http.get(localUrl+'/api/events',{headers},response=>{response.resume();resolve(response.statusCode);}).on('error',reject));
    assert.equal(status,403,JSON.stringify(headers));
  }
  const payload={event:'recording.transcript_completed',download_token:'credential',payload:{object:{id:'42',uuid:'meeting',topic:'John and Tom',recording_files:[{id:'file',file_type:'TRANSCRIPT',download_url:'https://example.test/transcript'}]}}};
  for(const outcome of ['succeeded','failed','incomplete']){
    const body=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000));
    const response=await fetch(publicUrl+'/zoom/transcripts',{method:'POST',body,headers:{'x-zm-request-timestamp':timestamp,'x-zm-signature':zoomSignature('test',timestamp,body)}});
    assert.equal(response.status,202);const {activityId}=await response.json();
    let row=await (await fetch(localUrl+'/api/events/'+activityId)).json();
    assert.equal(row.status,'running');assert.equal(row.title,'John and Tom');assert.equal(row.endpoint,'/zoom/transcripts');
    complete({status:outcome,metadata:{summary:'Controlled result'},error:outcome==='succeeded'?null:'Controlled failure'});
    await new Promise(setImmediate);
    row=await (await fetch(localUrl+'/api/events/'+activityId)).json();assert.equal(row.status,outcome);assert.ok(row.endedAt);
  }
  service.receive({id:'restart',endpoint:'/future',metadata:{nested:{list:[1,2]}}});service.start('restart');service.recover();
  const result=await (await fetch(localUrl+'/api/events?status=incomplete&limit=1')).json();assert.equal(result.items[0].id,'restart');
  assert.equal((await fetch(localUrl+'/api/events?limit=999')).status,400);
  assert.equal((await fetch(localUrl+'/api/events/missing')).status,404);
  assert.ok(!JSON.stringify(service.list()).includes('credential'));
});
