import {apiClient,createState,route,render} from './model.mjs';
const client=apiClient(),state=createState(client),content=document.querySelector('#content'),form=document.querySelector('#filters');
let generation=0;
const expandedByRoute=new Map();
let displayedRoute=location.pathname+location.search;
function saveExpanded(){expandedByRoute.set(displayedRoute,new Set([...content.querySelectorAll('details[open]')].map(x=>x.dataset.id)));}
async function refresh(){
  saveExpanded();
  displayedRoute=location.pathname+location.search;
  const current=++generation,open=expandedByRoute.get(displayedRoute)||new Set();
  const selected=route(location.pathname),query=Object.fromEntries(new URLSearchParams(location.search));
  if(document.activeElement!==form.elements.endpoint)form.elements.endpoint.value=query.endpoint||'';
  if(document.activeElement!==form.elements.status)form.elements.status.value=query.status||'';
  if(!selected){content.textContent='Page not found';return;}
  if(selected.id){try{const row=await client.detail(selected.id);if(current!==generation)return;content.innerHTML=render({items:[row]});content.querySelector('details').open=true;}catch(error){if(current===generation)content.textContent=error.message;}}
  else{const promise=state.load(query);content.innerHTML=render(state.value);await promise;if(current!==generation)return;content.innerHTML=render(state.value);for(const el of content.querySelectorAll('details'))el.open=open.has(el.dataset.id);}
  document.querySelector('#previous').disabled=!!selected.id||!(Number(query.offset)||0);
  document.querySelector('#next').disabled=!!selected.id||state.value.items.length<(Number(query.limit)||50);
}
function navigate(url){history.pushState({},'',url);refresh();}
document.addEventListener('click',event=>{const link=event.target.closest('a');if(link&&link.origin===location.origin&&!event.metaKey&&!event.ctrlKey){event.preventDefault();navigate(link.href);}});
form.addEventListener('submit',event=>{event.preventDefault();navigate('/events?'+new URLSearchParams(new FormData(form)));});
for(const [id,direction] of [['previous',-1],['next',1]])document.querySelector('#'+id).onclick=()=>{const q=new URLSearchParams(location.search);q.set('offset',Math.max(0,(Number(q.get('offset'))||0)+direction*(Number(q.get('limit'))||50)));navigate('/events?'+q);};
window.addEventListener('popstate',refresh);setInterval(refresh,5000);refresh();
