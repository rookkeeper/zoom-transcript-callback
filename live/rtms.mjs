import WebSocket from 'ws';
import { createHash } from 'node:crypto';
import { hmac, signalingUrl, validateServerUrl } from './security.mjs';

const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const recoveryMessage = 'Connection lost; transcript gaps cannot be recovered. If retries fail, stop and restart RTMS in Zoom.';

// One hosted meeting at a time. No OAuth store, recordings, native SDK, disk or payload logging.
export class RtmsController {
  constructor({ clientId, clientSecret, state, validateUrl = validateServerUrl, retryBaseMs = 3000, handshakeMs = 10000, idleMs = 70000 }) {
    Object.assign(this, { clientId, clientSecret, state, validateUrl, retryBaseMs, handshakeMs, idleMs });
    this.latest = 0;
    this.events = new Set();
    this.stopped = new Set();
  }
  handle(event) {
    if (this.closing) return;
    if (!event || !['meeting.rtms_started', 'meeting.rtms_stopped', 'meeting.rtms_interrupted'].includes(event.event)) return;
    const p = event.payload;
    if (!p || !id(p.meeting_uuid) || !id(p.rtms_stream_id) || !Number.isSafeInteger(event.event_ts) ||
        Math.abs(Date.now() - event.event_ts) > 300000) throw new Error('Invalid RTMS event');
    const key = `${p.meeting_uuid}\0${p.rtms_stream_id}`;
    const fingerprint = createHash('sha256').update(JSON.stringify([event.event, event.event_ts, key, p.server_urls])).digest('hex');
    if (event.event_ts < this.latest || this.events.has(fingerprint)) return;
    let url;
    if (event.event === 'meeting.rtms_started') url = signalingUrl(p.server_urls, this.validateUrl);
    this.events.add(fingerprint);
    if (this.events.size > 1024) this.events.delete(this.events.values().next().value);
    if (event.event === 'meeting.rtms_stopped') {
      this.stopped.add(key);
      if (this.stopped.size > 128) this.stopped.delete(this.stopped.values().next().value);
      if (p.stop_reason === 8 && this.state.meeting === p.meeting_uuid) this.state.clear(); // Revocation also applies to retained text after a socket has ended.
      if (this.session?.key !== key) return;
      this.latest = event.event_ts;
      this.end(Number(p.stop_reason) >= 10 ? 'disconnected' : 'ended', Number(p.stop_reason) >= 10 ? recoveryMessage : 'RTMS ended. Text remains in memory until cleared, a new meeting, or process exit.');
    } else if (event.event === 'meeting.rtms_interrupted') {
      if (this.session?.key !== key) return;
      this.latest = event.event_ts;
      this.retry('signal'); // This webhook has no server_urls; reuse the last validated URL.
    } else {
      if (this.stopped.has(key)) return;
      this.latest = event.event_ts;
      const reconnect = this.session?.key === key;
      this.dispose();
      this.session = { key, meeting: p.meeting_uuid, stream: p.rtms_stream_id, url };
      this.gap = reconnect || this.state.meeting === p.meeting_uuid;
      this.state.begin(p.meeting_uuid);
      this.state.setStatus(reconnect ? 'reconnecting' : 'connecting', reconnect ? recoveryMessage : 'Connecting to Zoom transcript stream.');
      this.connectSignal();
    }
  }
  auth(msg_type) {
    return { msg_type, protocol_version: 1, sequence: 1, meeting_uuid: this.session.meeting,
      rtms_stream_id: this.session.stream,
      signature: hmac(this.clientSecret, `${this.clientId},${this.session.meeting},${this.session.stream}`) };
  }
  send(ws, message) {
    if (!ws || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 65536) return false;
    ws.send(JSON.stringify(message), () => {}); // Errors are handled by the socket's error/close events.
    return true;
  }
  socket(kind, url, handshake) {
    let ws;
    try {
      ws = new WebSocket(this.validateUrl(url), { maxPayload: 65536, handshakeTimeout: this.handshakeMs,
        perMessageDeflate: false, followRedirects: false });
    } catch { this.end('disconnected', 'Zoom supplied an unsupported server address. Stop and restart RTMS in Zoom.'); return; }
    this[kind] = ws;
    ws.lastPacket = Date.now();
    ws.ready = false;
    const watchdog = setInterval(() => {
      if (Date.now() - ws.lastPacket > (ws.ready ? this.idleMs : this.handshakeMs)) ws.terminate();
    }, Math.min(1000, this.handshakeMs));
    watchdog.unref();
    ws.on('open', () => { if (this[kind] === ws) this.send(ws, handshake); });
    ws.on('message', bytes => {
      if (this[kind] !== ws || !this.session) return;
      let msg;
      try { msg = JSON.parse(bytes); } catch { return; }
      if (!msg || typeof msg !== 'object' || !Number.isInteger(msg.msg_type)) return;
      ws.lastPacket = Date.now();
      if (msg.msg_type === 12) {
        if (Number.isSafeInteger(msg.timestamp)) this.send(ws, { msg_type: 13, timestamp: msg.timestamp });
        return;
      }
      if (kind === 'signal') this.signalMessage(ws, msg);
      else this.mediaMessage(ws, msg);
    });
    ws.on('error', () => {}); // Never emit credential-bearing WS errors, URLs or close reasons.
    ws.on('close', () => {
      clearInterval(watchdog);
      if (this[kind] === ws && this.session) this.retry(kind);
    });
  }
  connectSignal() {
    if (!this.session) return;
    this.socket('signal', this.session.url, { ...this.auth(1), buffer_data: false });
  }
  connectMedia() {
    if (!this.session || !this.mediaUrl || this.media) return;
    this.socket('media', this.mediaUrl, { ...this.auth(3), media_type: 8, payload_encryption: false });
  }
  signalMessage(ws, msg) {
    if (msg.msg_type === 2 && !ws.ready) {
      if (msg.status_code !== 0) { this.end('disconnected', 'Zoom signaling handshake rejected. Check RTMS scope/authorization, then restart RTMS.'); return; }
      try { this.mediaUrl = this.validateUrl(msg.media_server?.server_urls?.transcript ?? msg.media_server?.server_urls?.all); }
      catch { this.end('disconnected', 'Zoom supplied an unsupported media address. Stop and restart RTMS.'); return; }
      ws.ready = true;
      this.send(ws, { msg_type: 5, events: [{ event_type: 7, subscribe: true }] });
      this.connectMedia();
    } else if (ws.ready && msg.msg_type === 6 && (msg.event?.event_type === 7 || msg.event_type === 7)) {
      this.retry('media');
    } else if (ws.ready && msg.msg_type === 8) {
      if (msg.state === 2) this.retry(msg.reason === 14 ? 'media' : 'signal');
      else if (msg.state === 3 || msg.state === 4) {
        if (msg.reason === 8) this.state.clear();
        this.end('ended', 'Zoom ended this stream. To reconnect, stop and restart RTMS in Zoom.');
      }
      else if (msg.state === 5) this.state.setStatus('paused', 'RTMS paused in Zoom.');
      else if (msg.state === 1 || msg.state === 6) { if (this.media?.ready) this.liveStatus(); }
    } else if (ws.ready && msg.msg_type === 9) {
      if (msg.state === 3 || msg.state === 5) this.state.setStatus('paused', 'Zoom session paused or stopped; waiting for it to resume.');
      else if ((msg.state === 2 || msg.state === 4) && this.media?.ready) this.liveStatus();
    }
  }
  mediaMessage(ws, msg) {
    if (msg.msg_type === 4 && !ws.ready) {
      if (msg.status_code !== 0 || msg.payload_encrypted === true) {
        this.end('disconnected', 'Zoom transcript handshake rejected or encryption unsupported. Check app setup, then restart RTMS.'); return;
      }
      ws.ready = true;
      if (!this.send(this.signal, { msg_type: 7, rtms_stream_id: this.session.stream })) { this.retry('signal'); return; }
      this.recovery = undefined;
      this.liveStatus();
    } else if (msg.msg_type === 17 && ws.ready && this.state.status === 'live') this.state.append(msg.content);
  }
  drop(kind) {
    const ws = this[kind];
    this[kind] = undefined;
    ws?.terminate();
  }
  liveStatus() {
    this.state.setStatus('live', this.gap ? 'Reconnected. There may be missing text; historical gaps cannot be recovered.' : '');
  }
  retry(kind) {
    if (!this.session || this.closing) return;
    this.gap = true;
    if (kind === 'signal') { this.drop('signal'); this.drop('media'); this.mediaUrl = undefined; }
    else this.drop('media');
    if (this.retryTimer) {
      if (kind === 'signal') this.recovery.kind = 'signal';
      return;
    }
    this.recovery ??= { kind, attempts: 0, since: Date.now() };
    if (kind === 'signal') this.recovery.kind = 'signal';
    const recovery = this.recovery;
    const delay = Math.min(this.retryBaseMs * 2 ** recovery.attempts, 30000);
    const window = recovery.kind === 'signal' ? 55000 : 25000;
    if (recovery.attempts >= 3 || Date.now() - recovery.since + delay >= window) {
      this.end('disconnected', recoveryMessage); return;
    }
    recovery.attempts++;
    this.state.setStatus('reconnecting', recoveryMessage);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      if (recovery.kind === 'signal') this.connectSignal(); else this.connectMedia();
    }, delay);
    this.retryTimer.unref();
  }
  dispose() {
    clearTimeout(this.retryTimer); this.retryTimer = undefined;
    this.recovery = undefined;
    this.drop('signal'); this.drop('media');
    this.mediaUrl = undefined;
    this.session = undefined;
  }
  end(status, detail) { this.dispose(); this.state.setStatus(status, detail); }
  async close() {
    if (this.closing) return;
    this.closing = true;
    clearTimeout(this.retryTimer);
    if (this.session && this.signal?.readyState === WebSocket.OPEN) {
      const ws = this.signal, stream = this.session.stream;
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 200);
        ws.send(JSON.stringify({ msg_type: 21, rtms_stream_id: stream }), () => { clearTimeout(timeout); resolve(); });
      });
    }
    this.end('disconnected', 'Live transcript service stopped.');
  }
}
