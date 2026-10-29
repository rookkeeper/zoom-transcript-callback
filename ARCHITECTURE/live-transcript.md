# Live transcript

Independent framework-free Node package in `live/`; only dependency at runtime is `ws`. No imports from `src/`, existing UI, database, OAuth store or Pi. Shares only root Zoom credentials/configuration loading. No disk transcript persistence or payload logging.

## Boundaries

- Public webhook listener (default 8789): only `POST /zoom/rtms`. Bounded raw body, timestamp/HMAC verification before parsing; signed validation challenge and RTMS lifecycle events. Meeting fields are at `payload`, not `payload.object`.
- Private listener (always 127.0.0.1, default 8790): `GET /live`, static `/live/*`, `GET /api/live/stream`, same-origin `POST /api/live/clear`. Exact local Host/Origin and forwarding/site checks, no CORS, no-store/CSP. Never tunnel it.
- Ingress routes the exact RTMS path before broad existing callback rules. Existing listeners remain separate.

## Protocol and state

`RtmsController` owns one hosted meeting, signaling/media sockets, lifecycle watermark, bounded duplicate/stop keys and bounded retry episodes. Started establishes HMAC-authenticated signaling (1/2), transcript-only media (3/4, type 8), then ready ACK (7) **on signaling**. Both respond to keepalives 12 with 13. Transcript data 17 maps literal speaker/text/timestamp into `TranscriptState`. Signaling subscribes to media-interruption event 7; media retries preserve signaling, signaling failure/interrupted webhook rebuild both, fresh same-stream started events handle failover. Rejection/exhaustion requires visible manual Zoom RTMS restart. Shutdown flushes stream-close 21 before socket cleanup.

WS URLs must be Zoom-owned TLS `*.zoom.us` on 443, without credentials/fragments; no redirects or disabled TLS verification. Unknown/malformed packets and non-JSON binary data are ignored, size limits enforced. JSON is accepted in either text or binary WS frames. Unencrypted transcript payloads only. Stream msg8 uses ACTIVE1, INTERRUPTED2, TERMINATING3, TERMINATED4, PAUSED5 and RESUMED6. Session msg9 uses STARTED2, PAUSED3, RESUMED4 and STOPPED5; a stopped session can resume without ending the stream. Ordinary ends retain text; revocation reason 8 immediately clears retained text and broadcasts an empty snapshot, including session stops and post-end webhooks.

`TranscriptState` is the sole retained transcript source: `{epoch, rows, dropped, status, detail}` snapshot; rows `{id, speaker, name, text, timestamp}`. Process-unique epoch prevents numeric ID reuse from retaining stale browser DOM after restart. New meeting clears rows; same-meeting recovery retains rows with gap warnings. Clear broadcasts an empty snapshot without stopping input. Retention max 2,000 rows/512 KiB; transcript dedup max 4,096 hashes. No replay beyond the retained snapshot is promised.

SSE frames carry `{type:'snapshot', ...snapshot}`, `{type:'append', row, firstId, dropped}` or `{type:'status', status, detail}`. Eight clients maximum; slow clients disconnect rather than queue arbitrary history. Browser reconnect gets a full snapshot, while stable per-row DOM preserves selection during normal appends. Copy is explicit; auto-scroll pause is local to each viewer. All supplied text uses `textContent` and a fixed CSS color palette.

## Operation and verification

[Live README](../live/README.md) owns configuration, setup, limits, safe start/stop and activation gates. The demo loads no `.env`, pins all endpoints to loopback and injects a narrowly validated ephemeral fake WS endpoint; production has no insecure-URL toggle. Actual HTTP/SSE/fake-WS tests and separate Playwright demo tests never call Zoom or recording/Pi services. Live account verification and independent browser QA remain separate gates.
