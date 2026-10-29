const $ = id => document.getElementById(id);
const transcript = $('transcript');
const nodes = new Map();
let rows = [], following = true, lastTop = 0, connected = false, epoch;
let status = 'waiting', detail = '', dropped = 0;
const labels = { waiting: 'Waiting', connecting: 'Connecting to Zoom', live: 'Live', paused: 'Paused in Zoom', reconnecting: 'Reconnecting to Zoom', disconnected: 'Disconnected', ended: 'Ended' };
function renderStatus() {
  $('status').textContent = connected ? (labels[status] ?? 'Waiting') : 'Disconnected from local service';
  $('detail').textContent = connected ? detail : 'Reconnecting locally. If the process restarted, previous text is lost. Zoom-side recovery may require stopping and restarting RTMS.';
  $('scroll-status').textContent = following ? '' : 'Auto-scroll paused';
  $('follow').textContent = following ? 'Pause auto-scroll' : 'Resume auto-scroll';
  $('follow').setAttribute('aria-pressed', String(!following));
  $('retention').textContent = dropped ? `${dropped} older lines discarded by the memory limit. Only retained text can be copied.` : '';
}
function pause() { following = false; renderStatus(); }
function hasSelection() {
  const selection = window.getSelection();
  return selection && !selection.isCollapsed && (transcript.contains(selection.anchorNode) || transcript.contains(selection.focusNode));
}
function scroll() {
  if (hasSelection()) pause();
  if (following) { transcript.scrollTop = transcript.scrollHeight; lastTop = transcript.scrollTop; }
}
function color(speaker) {
  let hash = 0;
  for (const char of speaker) hash = ((hash * 31) + char.codePointAt(0)) >>> 0;
  return hash % 8;
}
function append(row) {
  if (nodes.has(row.id)) return;
  const p = document.createElement('p'); p.className = `utterance speaker-${color(row.speaker)}`;
  const name = document.createElement('strong'); name.textContent = `${row.name}: `;
  const text = document.createElement('span'); text.textContent = row.text;
  p.append(name, text); transcript.append(p); nodes.set(row.id, p);
}
function renderRows() {
  const ids = new Set(rows.map(row => row.id));
  for (const [id, node] of nodes) if (!ids.has(id)) { node.remove(); nodes.delete(id); }
  for (const row of rows) append(row);
  $('empty').hidden = rows.length > 0;
  scroll();
}
const source = new EventSource('/api/live/stream');
source.onmessage = event => {
  let message; try { message = JSON.parse(event.data); } catch { return; }
  connected = true;
  if (message.type === 'snapshot') {
    if (epoch !== message.epoch) {
      for (const node of nodes.values()) node.remove();
      nodes.clear(); epoch = message.epoch;
    }
    rows = message.rows; status = message.status; detail = message.detail; dropped = message.dropped;
    renderRows();
  } else if (message.type === 'append') {
    rows.push(message.row); rows = rows.filter(row => row.id >= message.firstId); dropped = message.dropped;
    renderRows();
  } else if (message.type === 'status') { status = message.status; detail = message.detail; }
  renderStatus();
};
source.onerror = () => { connected = false; renderStatus(); };
$('follow').onclick = () => { following = !following; if (following) {
  window.getSelection()?.removeAllRanges(); scroll();
} renderStatus(); };
transcript.addEventListener('scroll', () => {
  if (transcript.scrollTop < lastTop - 2) pause();
  lastTop = transcript.scrollTop;
});
document.addEventListener('selectionchange', () => { if (hasSelection()) pause(); });
$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(rows.map(row => `${row.name}: ${row.text}`).join('\n'));
    $('notice').textContent = 'Copied transcript.';
  } catch { $('notice').textContent = 'Clipboard unavailable. Select text and use your browser’s Copy command.'; }
};
$('clear').onclick = async () => {
  if (!window.confirm('Clear retained transcript for every open viewer? Incoming text will continue.')) return;
  try {
    const response = await fetch('/api/live/clear', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error();
    $('notice').textContent = 'Transcript cleared for all viewers.';
  } catch { $('notice').textContent = 'Could not clear. Check the local service connection.'; }
};
window.addEventListener('pagehide', () => source.close());
