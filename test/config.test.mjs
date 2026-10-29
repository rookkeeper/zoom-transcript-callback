import test from "node:test";
import assert from "node:assert/strict";
import { ZOOM_TRANSCRIPT_PROMPT } from "../src/zoomPrompt.mjs";
import { loadConfig } from '../src/config.mjs';


test('existing public/private ports default to 8787/8788 and remain configurable', t => {
  const names=['SERVER_PORT','CALLBACK_PORT','EVENTS_PORT','ZOOM_WEBHOOK_SECRET'];
  const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  t.after(()=>{for(const name of names) { if(saved[name]===undefined) delete process.env[name]; else process.env[name]=saved[name]; }});
  process.env.SERVER_PORT='9999';
  delete process.env.CALLBACK_PORT; delete process.env.EVENTS_PORT;
  process.env.ZOOM_WEBHOOK_SECRET='fake-config-secret';
  assert.equal(loadConfig().port,8787); assert.equal(loadConfig().eventsPort,8788);
  process.env.CALLBACK_PORT='18887'; process.env.EVENTS_PORT='18888';
  assert.equal(loadConfig().port,18887); assert.equal(loadConfig().eventsPort,18888);
});

test("contains a minimal internal callback prompt", () => {
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /Zoom's recording\.transcript_completed callback/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /how-to-use-this-repo/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /{{callbackData}}/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /zoom-processing-result\.json/);
});
