# Live Zoom transcript (standalone)

A separate Node service for one hosted meeting at a time. Nothing imports the recording service or writes transcripts to disk. Browser refresh receives the current in-memory snapshot; a new meeting clears it. Process exit loses it. Same-meeting RTMS restarts retain text, but cannot recover gaps. Names and their text share stable speaker colors (a finite palette can repeat). Text stays selectable; scrolling upward or selecting pauses auto-scroll. Copy uses the clipboard only on request. Clear removes retained text from **all** viewers; incoming text continues. A Zoom revocation clears retained text immediately.

## Install and run

Requires Node >=22.16, outbound TLS WebSockets and `npm ci --prefix live` (own package/lockfile).

```sh
# From repository root; foreground, Ctrl-C to stop only this process:
node live/scripts/start.mjs
# Or: npm --prefix live start
```

Start reads **this checkout's root `.env`** if present. Exported environment and Node `--env-file` values take precedence. Only `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET` and `LIVE_*` below are used; no OAuth API calls or shared token store. Missing credentials fail startup with a generic message, never credential values. A worktree has no automatic access to the main checkout's `.env`; supply its absolute path explicitly:

```sh
node --env-file=/absolute/path/to/main-checkout/.env live/scripts/start.mjs
```

| Variable | Real default | Demo default |
| --- | --- | --- |
| `LIVE_WEBHOOK_HOST` | `127.0.0.1` (also allows `0.0.0.0` or `::1`) | fixed `127.0.0.1` |
| `LIVE_WEBHOOK_PORT` | `8789` | `18789` |
| `LIVE_UI_PORT` | `8790` | `18790` |

UI always binds `127.0.0.1`; its Host must be `127.0.0.1:<port>` or `localhost:<port>`. Ports must be distinct integers 1–65535. Other root `.env` settings are ignored. Startup refuses occupied ports and never kills listeners. Open `http://127.0.0.1:8790/live` locally. Stop via Ctrl-C, or keep the PID of the **direct Node process** you started:

```sh
node live/scripts/start.mjs & LIVE_PID=$!
# Later, in this same shell, without port-based process killing:
kill -TERM "$LIVE_PID"; wait "$LIVE_PID"
```

Shutdown attempts RTMS stream-close message 21, closes both WS connections, retries, SSE and HTTP listeners. Restart Node and stop/restart RTMS in Zoom if it has already timed out; restarting the browser alone cannot create a new Zoom stream.

## Zoom setup

Use the **Development** environment of the existing app throughout: credentials, scopes, event subscriptions and installation must match. Do not switch the shared `.env` to Production credentials just for this feature.

Local setup progress (2026-10-29): John added the three Meeting RTMS events in Development and reauthorized the app. The stored grant was checked: `meeting:read:meeting_transcript` is present and existing recording-file access is retained. **That verifies authorization only**, not billing eligibility, auto-start, endpoint validation, tunnel routing or a live stream. No real Zoom meeting has been tested.


1. Check Developer Pack/RTMS entitlement and available credits. RTMS can incur charges; **do not purchase credits without approval**.
2. In the existing **user-managed General app**, enable granular scopes if needed. Add only `meeting:read:meeting_transcript` for RTMS (keep existing recording scopes). No audio/video, REST RTMS-control scope, embedded app or native SDK is needed here.
3. Add an event subscription pointing at `https://<callback-host>/zoom/rtms` with `meeting.rtms_started`, `meeting.rtms_stopped`, **and `meeting.rtms_interrupted`**. Keep using the existing app's event-subscription Secret Token in shared `ZOOM_WEBHOOK_SECRET`; app credentials supply the other two shared values. Do not rotate the shared secret or replace the existing subscription just to enable RTMS. Keep the recording subscription and OAuth callback unchanged. Start this process and configure ingress before validating the endpoint. Validation requests must carry Zoom's timestamp/HMAC signature too.
4. Reauthorize the same Development app for the hosting user after scope changes. For this checkout, keep the existing callback listener/tunnel running and open [the existing authorization URL](https://zoom.us/oauth/authorize?response_type=code&client_id=Bxu8tCqbQdeUqCaOV39aZA&redirect_uri=https://dev-callbacks.arcturus-labs.com/zoom/oauth), review permissions and choose **Allow**. The existing `/zoom/oauth` callback exchanges the code and updates its token store automatically; no tokens need copying and no `.env` edit is needed. Keep all recording scopes selected. The live service itself makes no OAuth calls.
5. In account/admin Settings, permit apps to share realtime meeting content. In the host's profile Settings → **Zoom Apps** → **Auto-start apps that access shared realtime meeting content** → **+ Choose an app to auto-start**, select the app and Save. Restrict host approval/auto-start behavior to the meetings you host; participant consent and account controls still apply.
6. Start a **private synthetic test meeting you host**, with this service already running. Verify waiting → live, spoken synthetic text/speakers, pause/resume in Zoom and ended. If auto-start is unavailable, use Zoom's app RTMS controls. The local browser does not start RTMS. Allow 1–2 minutes for event changes to propagate.

Account permission, credits, scopes, reauthorization, auto-start and a private live meeting remain external verification gates. **No live Zoom validation has been performed.**

### Tunnel routing (do not expose the viewer)

Reuse the existing hostname **`dev-callbacks.arcturus-labs.com`** and tunnel; this is a new path, not a new hostname or tunnel. The endpoint is `https://dev-callbacks.arcturus-labs.com/zoom/rtms`. Add the exact RTMS path rule **before** any existing same-host catch-all rule. Preserve existing recording/OAuth routing to 8787. The current tunnel is remote token-managed: configure its route ordering through the authorized remote management surface; editing a local ingress file will not apply it. Example Cloudflare ingress fragment illustrating the required ordering (not an applied configuration):

```yaml
- hostname: <callback-host>
  path: ^/zoom/rtms$
  service: http://127.0.0.1:8789
# Existing hostname/path rules follow unchanged, including recording and OAuth.
# Never add ingress to 8790, /live, /api/live/*, or the existing private history port.
```

The public listener serves only `POST /zoom/rtms`; it has no transcript routes. UI/SSE reject forwarding headers, nonlocal Host, nonmatching Origin and cross-site browser requests. No CORS is enabled. This is a same-machine viewer, not authenticated remote sharing: local users/processes can access it. Do not use an untrusted local proxy to bypass these protections.

## Recovery and limits

Signaling/media handshake, ready ACK on **signaling**, transcript-only media type 8, message type 17 and keepalive 12→13 follow Zoom's WS protocol. Duplicate webhook redeliveries do nothing; a fresh started event for the same stream rebuilds both sockets (server failover). Interrupted webhooks reconnect both using the last validated signaling URL; media failures reconnect media only. Retries use 3/6/12 seconds, at most three per recovery episode, within 55s signaling /25s media scheduling windows; successful media handshakes reset the episode. Handshakes time out after 10s, silent sockets after 70s. Recovered streams warn about irrecoverable gaps. Exhaustion/rejection shows a visible disconnected status: stop and restart RTMS in Zoom. Paused/ended states are distinct from local auto-scroll pause or disconnected SSE. Transport recovery never resumes a Zoom-paused stream/session; an explicit Zoom resume is required. Interruption event 7 is delivered automatically, not subscribed to.

Only validated `wss://*.zoom.us` URLs on port 443 are contacted, without credentials/fragments/redirects, with normal TLS verification. Comma-separated advertised URLs select the first validated WS candidate; non-WS protocols aren't contacted. Other endpoint domains/encrypted payloads fail visibly rather than weakening validation; verify actual account endpoints during live activation.

Memory holds at most **2,000 rows /512 KiB serialized row data**, whichever comes first; UI displays discarded-line count. Rows over 8,192 characters or speaker names over 256 are rejected. Input WS messages max 64 KiB, webhook raw bodies max 64 KiB, signatures/event timestamps max age ±300s. Duplicate retention is bounded (4,096 transcript hashes, 1,024 webhook hashes, 128 stopped stream keys); extremely old transcript replays after that window can reappear. Events older than the lifecycle watermark are ignored. Only one meeting is active; a newer meeting supersedes it. Up to eight SSE viewers receive snapshots; slow viewers are disconnected instead of growing a queue and reconnect for a fresh snapshot. No durable history, audio/video capture, hidden file logs, analytics, localStorage or transcript console logging. OS/browser memory and an explicitly copied clipboard are outside this service's persistence guarantees.

## Isolated synthetic demo / QA

```sh
npm ci --prefix live
# No credentials, no .env loading, no Zoom/account/tunnel/Pi/vault actions:
LIVE_WEBHOOK_PORT=18789 LIVE_UI_PORT=18790 node live/scripts/demo.mjs
# Open http://127.0.0.1:18790/live ; Ctrl-C to stop.
```

Demo pins webhook and UI to loopback and uses an ephemeral fake Zoom WS server, fake credentials and a signed fake started webhook through the actual HTTP listener. It seeds 100 lines from three speakers and adds one synthetic line/second with keepalives. There is **no production env flag to allow insecure WS**. For background demo operation use the direct-node PID pattern above. Don't run the existing `run-server.sh` or recording fake-callback script for this task.

Independent walkthrough:
1. Observe Live and three colors; name and text match. Literal `<script>` sample stays inert.
2. Scroll upward/select text: Auto-scroll paused; new text doesn't move selection. Resume returns to the bottom.
3. Copy and paste into a disposable local buffer; compare speaker labels. Clear (confirm) removes retained text in every tab, while new text continues.
4. Reload before clearing: existing text remains. Reload after clearing: cleared text doesn't return. Stop demo: Disconnected from local service appears. Restart demo: a new snapshot replaces old text.
5. `curl -i http://127.0.0.1:18789/live` → 404; `curl -i -H 'X-Forwarded-For: 127.0.0.1' http://127.0.0.1:18790/live` → 403. No public stream route.

```sh
npm --prefix live test                 # Unit + actual HTTP/SSE/fake-Zoom WS tests
npm --prefix live run test:browser     # Chromium, own demo ports 19789/19790
# If Chromium is missing: cd live && npx playwright install chromium
npm test                              # Existing recording suite, unchanged
```

Browser tests refuse reused listeners, exercise real demo/viewer, clipboard, selection, pause, refresh, clear and process-generation snapshots. Parent independently performs visual/browser QA and external activation; automated tests are not a claim of a live Zoom run. Server stdout contains startup locations or generic startup failure only; status/detail in the viewer provide safe diagnostics. Never enable raw WS/HTTP debug logging with real meetings.

Sources: [WS quickstart](https://developers.zoom.us/docs/rtms/meetings/quickstart-websockets/), [universal events](https://developers.zoom.us/docs/rtms/event-reference/universal-events/), [failover/reconnection](https://developers.zoom.us/docs/rtms/meetings/failover-reconnection/), [features/scopes](https://developers.zoom.us/docs/rtms/meetings/add-features/), [auto-start](https://developers.zoom.us/docs/rtms/meetings/quickstart/). Unlike sample code, this utility never disables TLS verification or logs payloads.
