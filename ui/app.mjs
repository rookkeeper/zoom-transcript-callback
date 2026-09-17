import {apiClient,createState,route,render,rowHtml,itemsEqual} from './model.mjs';
const client=apiClient(),state=createState(client),content=document.querySelector('#content'),form=document.querySelector('#filters');
let generation=0;
const expandedByRoute=new Map();
function currentRouteKey(){return location.pathname+location.search;}
let displayedRoute=currentRouteKey();
function saveExpanded(){expandedByRoute.set(displayedRoute,new Set([...content.querySelectorAll('details[open]')].map(x=>x.dataset.id)));}
function syncFilters(query){
  if(document.activeElement!==form.elements.endpoint&&form.elements.endpoint.value!==(query.endpoint||''))form.elements.endpoint.value=query.endpoint||'';
  if(document.activeElement!==form.elements.status&&form.elements.status.value!==(query.status||''))form.elements.status.value=query.status||'';
}
function updateNav(selected,query){
  const prev=document.querySelector('#previous'),next=document.querySelector('#next');
  const prevDisabled=!!selected?.id||!(Number(query.offset)||0);
  const nextDisabled=!!selected?.id||state.value.items.length<(Number(query.limit)||50);
  if(prev.disabled!==prevDisabled)prev.disabled=prevDisabled;
  if(next.disabled!==nextDisabled)next.disabled=nextDisabled;
}
function openSetFromDom(){return new Set([...content.querySelectorAll('details[open]')].map(x=>x.dataset.id));}
function syncErrorNode(message){
  let alert=content.querySelector('[role=alert]');
  if(!message){alert?.remove();return;}
  if(alert){if(alert.textContent!==message)alert.textContent=message;}
  else{alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent=message;content.prepend(alert);}
}
function syncEmptyMessage(items){
  let empty=content.querySelector('[data-empty]');
  if(!items.length){if(!empty){empty=document.createElement('p');empty.dataset.empty='';empty.textContent='No callbacks recorded yet.';content.append(empty);}}
  else empty?.remove();
}
function refreshRowContent(entry,row){
  const template=document.createElement('template');
  template.innerHTML=`<table><tbody>${rowHtml(row)}</tbody></table>`;
  const [freshTitle,freshDetails]=[...template.content.querySelector('tbody').children];
  const currentTitle=entry.titleRow.querySelector('td'),freshTitleCell=freshTitle.querySelector('td');
  if(currentTitle&&freshTitleCell&&currentTitle.innerHTML!==freshTitleCell.innerHTML)currentTitle.innerHTML=freshTitleCell.innerHTML;
  const currentPre=entry.detailsRow.querySelector('pre'),freshPre=freshDetails.querySelector('pre');
  if(currentPre&&freshPre&&currentPre.textContent!==freshPre.textContent)currentPre.textContent=freshPre.textContent;
}
function patchList(items){
  const open=openSetFromDom();
  const tbody=content.querySelector('tbody');
  if(!tbody){fullListRender(open);return;}
  const existing=new Map();
  for(const details of tbody.querySelectorAll('details')){
    const detailsRow=details.closest('tr'),titleRow=detailsRow?.previousElementSibling;
    if(titleRow&&detailsRow)existing.set(details.dataset.id,{titleRow,detailsRow});
  }
  const seen=new Set(items.map(row=>row.id));
  for(const [id,entry] of existing)if(!seen.has(id)){entry.titleRow.remove();entry.detailsRow.remove();existing.delete(id);}
  const template=document.createElement('template');
  items.forEach((row,index)=>{
    let entry=existing.get(row.id);
    if(!entry){
      template.innerHTML=`<table><tbody>${rowHtml(row)}</tbody></table>`;
      const [titleRow,detailsRow]=[...template.content.querySelector('tbody').children];
      if(open.has(row.id))detailsRow.querySelector('details').open=true;
      entry={titleRow,detailsRow};existing.set(row.id,entry);
    }else refreshRowContent(entry,row);
    const det=entry.detailsRow.querySelector('details');
    if(det&&det.open!==open.has(row.id))det.open=open.has(row.id);
    const expectedTitle=tbody.children[index*2]||null,expectedDetails=tbody.children[index*2+1]||null;
    if(entry.titleRow!==expectedTitle||entry.detailsRow!==expectedDetails){
      tbody.insertBefore(entry.titleRow,expectedTitle);
      tbody.insertBefore(entry.detailsRow,entry.titleRow.nextSibling);
    }
  });
  syncEmptyMessage(items);
  expandedByRoute.set(displayedRoute,openSetFromDom());
}
function fullListRender(open){
  content.innerHTML=render(state.value);
  for(const el of content.querySelectorAll('details'))el.open=open.has(el.dataset.id);
}
async function refresh({quiet=false}={}){
  if(!quiet)saveExpanded();
  displayedRoute=currentRouteKey();
  const current=++generation,open=expandedByRoute.get(displayedRoute)||openSetFromDom();
  const selected=route(location.pathname),query=Object.fromEntries(new URLSearchParams(location.search));
  if(!quiet)syncFilters(query);
  if(!selected){if(content.textContent!=='Page not found')content.textContent='Page not found';return;}
  if(selected.id){
    if(!quiet){
      try{const row=await client.detail(selected.id);if(current!==generation)return;
        state.value={...state.value,items:[row],loading:false,error:null};
        content.innerHTML=render({items:[row]});content.querySelector('details').open=true;syncErrorNode(null);}
      catch(error){if(current===generation){syncErrorNode(error.message);if(!content.querySelector('table'))content.textContent=error.message;}}
    }else{
      const previous=JSON.stringify(state.value.items);
      try{const row=await client.detail(selected.id);if(current!==generation||currentRouteKey()!==displayedRoute)return;
        const next=JSON.stringify([row]);
        if(previous===next){syncErrorNode(null);updateNav(selected,query);return;}
        state.value={...state.value,items:[row],loading:false,error:null};
        const wasOpen=content.querySelector('details')?.open??true;
        content.innerHTML=render({items:[row]});content.querySelector('details').open=wasOpen;syncErrorNode(null);
      }catch(error){if(current===generation)syncErrorNode(error.message);}
    }
  }
  else{
    if(!quiet){
      const promise=state.load(query);content.innerHTML=render(state.value);await promise;if(current!==generation)return;content.innerHTML=render(state.value);
      for(const el of content.querySelectorAll('details'))el.open=open.has(el.dataset.id);
    }else{
      const before=state.value.items;
      await state.load(query,{quiet:true});if(current!==generation||currentRouteKey()!==displayedRoute)return;
      if(state.value.error){syncErrorNode(state.value.error);}
      else{
        syncErrorNode(null);
        if(itemsEqual(before,state.value.items)){updateNav(selected,query);expandedByRoute.set(displayedRoute,openSetFromDom());return;}
        patchList(state.value.items);
      }
    }
  }
  updateNav(selected,query);
}
function navigate(url){history.pushState({},'',url);refresh();}
document.addEventListener('click',event=>{const link=event.target.closest('a');if(link&&link.origin===location.origin&&!event.metaKey&&!event.ctrlKey){event.preventDefault();navigate(link.href);}});
document.addEventListener('toggle',event=>{if(event.target.matches?.('details[data-id]'))expandedByRoute.set(displayedRoute,openSetFromDom());},true);
form.addEventListener('submit',event=>{event.preventDefault();navigate('/events?'+new URLSearchParams(new FormData(form)));});
for(const [id,direction] of [['previous',-1],['next',1]])document.querySelector('#'+id).onclick=()=>{const q=new URLSearchParams(location.search);q.set('offset',Math.max(0,(Number(q.get('offset'))||0)+direction*(Number(q.get('limit'))||50)));navigate('/events?'+q);};
window.addEventListener('popstate',()=>refresh());
setInterval(()=>{if(!document.hidden)refresh({quiet:true});},5000);refresh();
