import { randomUUID } from 'node:crypto';
import { transcriptDetails, validationResponse, verifyZoomSignature } from './zoom.mjs';

export function callbackHandler(config, activities, processor) {
  return async (request, response) => {
    const endpoint = request.url.split('?')[0];
    if (request.method !== 'POST' || endpoint !== '/zoom/transcripts') { response.writeHead(404).end(); return; }
    const id = randomUUID();
    const send = (status, body) => response.writeHead(status, { 'content-type':'application/json' }).end(body === undefined ? undefined : JSON.stringify(body));
    try {
      activities.receive({ id, endpoint, metadata:{ method:request.method } });
      const chunks=[]; let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > config.maxBodyBytes) throw new Error('Payload too large');
        chunks.push(chunk);
      }
      const raw=Buffer.concat(chunks).toString('utf8');
      const timestamp = request.headers['x-zm-request-timestamp'], signature = request.headers['x-zm-signature'];
      if (typeof timestamp !== 'string' || typeof signature !== 'string' || !verifyZoomSignature({ secret:config.zoomSecret,timestamp,signature,rawBody:raw,maxAgeSeconds:config.maxTimestampAgeSeconds })) {
        activities.finish(id,'failed',{},'Invalid signature or timestamp'); send(401); return;
      }
      const body = JSON.parse(raw);
      activities.update(id,{ type:body.event || 'unknown', title:typeof body.payload?.object?.topic === 'string' ? body.payload.object.topic : body.event || 'Zoom callback' });
      if (body.event === 'endpoint.url_validation') {
        const token = body.payload?.plainToken;
        if (typeof token !== 'string' || !token) throw new Error('Missing validation token');
        activities.finish(id,'succeeded'); send(200,validationResponse(config.zoomSecret,token)); return;
      }
      if (body.event !== 'recording.transcript_completed') { activities.finish(id,'incomplete',{},'Unsupported Zoom event'); send(204); return; }
      const details = transcriptDetails(body);
      activities.update(id,{ metadata:{ meetingId:details.meetingId,meetingUuid:details.meetingUuid,recordingFileId:details.recordingFileId,model:config.piModel } });
      // Acknowledge before model work; processor owns asynchronous completion.
      send(202,{ accepted:true, activityId:id });
      void activities.run(id,()=>processor(details,id)).catch(error=>console.error('Unable to persist outcome',id,error.code || error.name));
    } catch (error) {
      try { if (activities.get(id)) activities.finish(id,'failed',{},'Callback validation or storage failed'); } catch {}
      console.error('Callback failed',id,error.code || error.name);
      if (!response.headersSent) send(400,{ error:'Invalid webhook or unavailable storage' });
    }
  };
}
