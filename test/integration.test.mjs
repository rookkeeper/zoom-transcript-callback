import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { createApplication } from '../src/application.mjs';
import { ActivityService } from '../src/activities.mjs';
import { ActivityRepository } from '../src/repository.mjs';
import { zoomSignature } from '../src/zoom.mjs';
import { createLiveHandlers } from '../live/server.mjs';
import { TranscriptState } from '../live/state.mjs';

test('signed callback is acknowledged before completion, queried locally, and protected from public ingress', async t=>{
  const repo=new ActivityRepository(':memory:');t.after(()=>repo.close());
  const service=new ActivityService(repo);
  let complete;
  const config={zoomSecret:'test',maxBodyBytes:10000,maxTimestampAgeSeconds:300,piModel:'test',piMaxAttempts:1};
  const state=new TranscriptState();
  state.append({user_id:1,user_name:'Synthetic speaker',timestamp:1,data:'Synthetic shared-server fixture'});
  const live=createLiveHandlers({webhookSecret:'test',state,controller:{handle(){},async close(){}}});
  const app=createApplication(config,service,()=>new Promise(resolve=>{complete=resolve;}),{live});
  t.after(()=>app.close());
  assert.ok(app.callback && app.admin,'One process must compose separate public/private listeners');
  for (const server of [app.callback,app.admin]) { server.listen(0,'127.0.0.1'); await once(server,'listening'); }
  const publicUrl=`http://127.0.0.1:${app.callback.address().port}`,localUrl=`http://127.0.0.1:${app.admin.address().port}`;
  assert.notEqual(publicUrl,localUrl);
  for(const path of ['/events','/api/events','/live','/live/app.mjs','/api/live/stream','/api/live/clear']){
    assert.equal((await fetch(publicUrl+path)).status,404,`Public listener must never mount ${path}`);
    for(const headers of [{host:'public.example'},{'x-forwarded-host':'public.example'},{'cf-ray':'fake-ray'},{'cf-connecting-ip':'1.2.3.4'},{forwarded:'for=1.2.3.4'},{via:'proxy'},{origin:'https://evil.example'},{'sec-fetch-site':'cross-site'}]){
      const status=await new Promise((resolve,reject)=>http.get(localUrl+path,{headers},response=>{response.resume();resolve(response.statusCode);}).on('error',reject));
      assert.equal(status,403,`${path} ${JSON.stringify(headers)}`);
    }
  }
  assert.equal((await fetch(localUrl+'/live')).status,200);
  assert.equal((await fetch(localUrl+'/events')).status,200);
  assert.equal((await fetch(localUrl+'/not-a-route')).status,404);
  assert.equal((await fetch(localUrl+'/zoom/oauth')).status,404);
  assert.equal((await fetch(localUrl+'/zoom/rtms',{method:'POST'})).status,404);
  const stream=await fetch(localUrl+'/api/live/stream');
  const reader=stream.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value),/Synthetic shared-server fixture/);
  await reader.cancel();
  const challenge=JSON.stringify({event:'endpoint.url_validation',payload:{plainToken:'synthetic-challenge'}});
  const timestamp=String(Math.floor(Date.now()/1000));
  for(const path of ['/zoom/transcripts','/zoom/rtms']){
    const response=await fetch(publicUrl+path,{method:'POST',body:challenge,headers:{host:'public.example','cf-ray':'fake','x-zm-request-timestamp':timestamp,'x-zm-signature':zoomSignature('test',timestamp,challenge)}});
    assert.equal(response.status,200,path);
    assert.equal((await response.json()).plainToken,'synthetic-challenge');
    assert.equal((await fetch(publicUrl+path,{method:'POST',body:challenge})).status,401);
  }
  assert.equal((await fetch(publicUrl+'/zoom/oauth',{headers:{host:'public.example','cf-ray':'fake'}})).status,400);
  const payload={event:'recording.transcript_completed',payload:{object:{id:'42',uuid:'meeting',topic:'John and Tom'}}};
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
