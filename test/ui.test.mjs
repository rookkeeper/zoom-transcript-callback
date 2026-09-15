import test from 'node:test';
import assert from 'node:assert/strict';
import { route,apiClient,createState,render } from '../ui/model.mjs';
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
