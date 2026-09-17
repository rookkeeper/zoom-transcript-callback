const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timeOptions={hour:'2-digit',minute:'2-digit',second:'2-digit'};
function localDate(value){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleDateString():'';}
function localTime(value){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleTimeString([],timeOptions):'';}
function elapsed(startedAt,endedAt){
  const start=Date.parse(startedAt),end=Date.parse(endedAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return '';
  let seconds=Math.round((end-start)/1000);
  const parts=[];
  const hours=Math.floor(seconds/3600); if(hours)parts.push(`${hours}h`); seconds%=3600;
  const minutes=Math.floor(seconds/60); if(minutes)parts.push(`${minutes}m`); seconds%=60;
  if(seconds||!parts.length)parts.push(`${seconds}s`);
  return parts.join(' ');
}
function metadata(value,indent='') {
  if(value && typeof value==='object')return Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>`${indent}${JSON.stringify(k)}:${v && typeof v==='object'?'\n'+metadata(v,indent+'  '):' '+JSON.stringify(v)}`).join('\n');
  return indent+JSON.stringify(value);
}
export function metadataText(row) {
  return metadata({type:row.type,error:row.error,...row.metadata});
}
export function rowHtml(row) {
  return `<tr><td><a href="/events/${encodeURIComponent(row.id)}">${escape(row.title)}</a><small>${escape(row.endpoint)}</small></td><td>${escape(localDate(row.receivedAt))}</td><td>${escape(localTime(row.startedAt)||'Pending')}</td><td>${escape(localTime(row.endedAt)||'Pending')}</td><td>${escape(elapsed(row.startedAt,row.endedAt)||'—')}</td><td>${escape(row.status)}</td></tr><tr><td colspan="6"><details data-id="${escape(row.id)}"><summary>Metadata</summary><pre>${escape(metadataText(row))}</pre></details></td></tr>`;
}
export function itemsEqual(a=[],b=[]) {
  return JSON.stringify(a)===JSON.stringify(b);
}
export function render({items=[],loading=false,error=null}) {
  return `${error?`<p role="alert">${escape(error)}</p>`:''}${loading?'<p>Refreshing…</p>':''}${!items.length?'<p>No callbacks recorded yet.</p>':''}<table><thead><tr><th>Title / endpoint</th><th>Date</th><th>Started</th><th>Ended</th><th>Δ</th><th>Status</th></tr></thead><tbody>${items.map(rowHtml).join('')}</tbody></table>`;
}
