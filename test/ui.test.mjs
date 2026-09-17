import test from 'node:test';
import assert from 'node:assert/strict';
import { route,apiClient,createState,render,rowHtml,itemsEqual } from '../ui/model.mjs';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
test('routes and components expose endpoints and escape arbitrary metadata',()=>{
  assert.deepEqual(route('/events/a'),{id:'a'});
  assert.deepEqual(route('/events'),{id:null});
  assert.equal(route('/unrelated'),null);
  assert.deepEqual(route('/'),{id:null});
  assert.equal(route('/events/%zz'),null);
  const html=render({items:[{id:'a',title:'<img>',endpoint:'/zoom',status:'running',metadata:{x:'<script>'}}],loading:false,error:null});
  assert.ok(html.includes('/zoom')); assert.ok(html.includes('&lt;img&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(render({items:[],loading:false}).includes('No callbacks'));
});
test('event rows show local date, local times without millis, and elapsed delta',()=>{
  const html=render({items:[{id:'a',title:'Call',endpoint:'/zoom',status:'succeeded',receivedAt:'2026-09-17T17:14:58.648Z',startedAt:'2026-09-17T17:14:58.657Z',endedAt:'2026-09-17T17:17:39.412Z',metadata:{}}],loading:false,error:null});
  const received=new Date('2026-09-17T17:14:58.648Z').toLocaleDateString();
  const started=new Date('2026-09-17T17:14:58.657Z').toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const ended=new Date('2026-09-17T17:17:39.412Z').toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  assert.ok(html.includes(escapeHtml(received)));
  assert.ok(html.includes(escapeHtml(started)));
  assert.ok(html.includes(escapeHtml(ended)));
  assert.ok(!html.includes('2026-09-17T17:14:58'));
  assert.ok(!html.includes('.648')&&!html.includes('.412'));
  assert.ok(html.includes('2m 41s'));
  assert.ok(html.includes('Δ'));
});
test('pending rows show placeholders and an empty delta',()=>{
  const html=render({items:[{id:'b',title:'Call',endpoint:'/zoom',status:'running',receivedAt:'2026-09-17T17:14:58.648Z',startedAt:null,endedAt:null,metadata:{}}],loading:false,error:null});
  assert.ok(html.includes('Pending'));
  assert.ok(!html.includes('NaN')&&!html.includes('undefined'));
});
test('client and view state handle filters, errors and stale refresh',async()=>{
  let requested=''; const client=apiClient(async url=>{requested=url;return {ok:true,json:async()=>({items:[]})};});
  await client.list({endpoint:'/zoom',offset:2}); assert.ok(requested.includes('endpoint=%2Fzoom'));
  await assert.rejects(()=>apiClient(async()=>({ok:false,status:500})).list({}));
  const pending=[]; const state=createState({list:()=>new Promise(r=>pending.push(r))});
  const first=state.load({offset:0}), second=state.load({offset:50});
  pending[1]({items:[{id:'new'}]}); await second;
  pending[0]({items:[{id:'old'}]}); await first;
  assert.equal(state.value.items[0].id,'new');
});
test('quiet state loads skip the loading flash and clear errors only on success',async()=>{
  let calls=0; const state=createState({list:async()=>{calls++; if(calls===1)throw new Error('boom'); return {items:[{id:'a'}]};}});
  await state.load({}); assert.equal(state.value.loading,false); assert.equal(state.value.error,'boom');
  assert.equal(state.value.loading,false);
  await state.load({},{quiet:true}); assert.equal(state.value.loading,false); assert.equal(state.value.error,null);
  assert.equal(state.value.items[0].id,'a');
});
test('row helpers reuse escaped markup and detect unchanged lists',()=>{
  const row={id:'a',title:'<img>',endpoint:'/zoom',status:'running',metadata:{x:'<script>'}};
  const html=rowHtml(row);
  assert.ok(html.includes('&lt;img&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(itemsEqual([row],[JSON.parse(JSON.stringify(row))]));
  assert.ok(!itemsEqual([row],[{...row,status:'failed'}]));
  assert.ok(render({items:[row],loading:true}).includes('Refreshing'));
});
