const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function metadata(value,indent='') {
  if(value && typeof value==='object')return Object.entries(value).map(([k,v])=>`${indent}${JSON.stringify(k)}:${v && typeof v==='object'?'\n'+metadata(v,indent+'  '):' '+JSON.stringify(v)}`).join('\n');
  return indent+JSON.stringify(value);
}
export function render({items=[],loading=false,error=null}) {
  return `${error?`<p role="alert">${escape(error)}</p>`:''}${loading?'<p>Refreshing…</p>':''}${!items.length?'<p>No callbacks recorded yet.</p>':''}<table><thead><tr><th>Title / endpoint</th><th>Received</th><th>Started</th><th>Ended</th><th>Status</th></tr></thead><tbody>${items.map(row=>`<tr><td><a href="/events/${encodeURIComponent(row.id)}">${escape(row.title)}</a><small>${escape(row.endpoint)}</small></td><td>${escape(row.receivedAt)}</td><td>${escape(row.startedAt||'Pending')}</td><td>${escape(row.endedAt||'Pending')}</td><td>${escape(row.status)}</td></tr><tr><td colspan="5"><details data-id="${escape(row.id)}"><summary>Metadata</summary><pre>${escape(metadata({type:row.type,error:row.error,...row.metadata}))}</pre></details></td></tr>`).join('')}</tbody></table>`;
}
