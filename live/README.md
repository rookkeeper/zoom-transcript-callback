# Live Zoom transcript

Open **http://127.0.0.1:8788/live** while hosting a meeting. Speaker names and text share consistent colors. Text is selectable/copyable; selecting or scrolling up pauses auto-scroll. Refresh gets the current in-memory transcript. New meetings/process restart clear it; no transcript files are saved. Clear affects all viewers; new text continues. Revocation clears text immediately.

## Server and privacy

Recording/history and live transcription have separate cores but share **one process**, retaining the original **public8787 / local8788** listeners. `src/application.mjs` is the thin router; `routing/localAccess.mjs` is the common private-access guard. No shared transcript database, Pi processing or recording deletion is introduced by RTMS.

| Route | Access |
| --- | --- |
| `POST /zoom/transcripts` | Public8787, signed recording webhook |
| `GET /zoom/oauth` | Public8787, OAuth callback |
| `POST /zoom/rtms` | Public8787, signed RTMS webhook/validation |
| `/events`, `/api/events/*`, history assets | Local8788 only |
| `/live`, `/live/*`, `GET /api/live/stream`, `POST /api/live/clear` | Local8788 only |

The public listener never mounts private paths (404). The private listener binds loopback only; requests additionally require a loopback peer **and** exact `127.0.0.1:<port>`/`localhost:<port>` Host, no forwarding/Cloudflare headers, and matching Origin/site. Checking peer alone is unsafe because Cloudflare also connects locally. Untrusted requests are denied before handlers run. Clear additionally requires a same-origin JSON POST. Unknown routes return 404. No CORS; text is rendered literally, not HTML. Other local processes/users can access these pages; this is not authenticated remote sharing.

## Start/stop

Requires Node >=22.16. From repository root:

```sh
npm ci
./scripts/run-server.sh
# Or, isolated/direct startup preserving exported env overrides:
node --env-file=.env src/index.mjs
```

`CALLBACK_PORT` defaults to **8787**, `EVENTS_PORT` to **8788**; `CALLBACK_HOST` defaults to `127.0.0.1`, and the private listener always binds loopback. `SERVER_PORT` from the abandoned single-port experiment is ignored. Normal startup ignores all `LIVE_*` port settings (they are demo/test-only). The existing root `.env` supplies the same Development Zoom app's `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` and `ZOOM_WEBHOOK_SECRET`. Never paste them into browser code or logs. `npm --prefix live start` is a compatibility entry point to the shared server, not a second service.

On this Mac the existing **`com.rookkeeper.zoom-transcript-callback`** LaunchAgent owns both mini-apps. The old independent `com.rookkeeper.zoom-live-transcript` agent must be unloaded/removed; do not run two receivers. Shared restart affects both apps and clears in-memory live text. Wait for active recording jobs before restarting; `run-server.sh` stops existing listeners on the configured port.

```sh
launchctl print "gui/$(id -u)/com.rookkeeper.zoom-transcript-callback"
# Stop (wait for active jobs first):
launchctl bootout "gui/$(id -u)/com.rookkeeper.zoom-transcript-callback"
# Start:
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.rookkeeper.zoom-transcript-callback.plist"
```

Diagnostics: shared LaunchAgent startup log under `~/Library/Logs/zoom-transcript-callback.log`; live connection state/detail in the viewer. Never enable raw HTTP/WS payload logging. Existing Pi logs belong to recording processing, not live text.

## Zoom setup

Use the existing **user-managed General app, Development environment** throughout. Keep existing recording scopes/subscription and credentials unchanged.

1. Confirm Developer Pack/RTMS entitlement and credits. RTMS is metered; don't purchase credits without approval.
2. Add `meeting:read:meeting_transcript` only for RTMS media access. No live audio/video, REST RTMS-control scope, native SDK or embedded Zoom app is required.
3. Add the Development subscription events **RTMS started in Meeting**, **RTMS stopped in Meeting**, **RTMS interrupted in Meeting**. Endpoint: **`https://dev-callbacks.arcturus-labs.com/zoom/rtms`**. Use the existing app's webhook Secret Token. Start the server before validating/saving. Requests must carry Zoom's timestamp/HMAC signature.
4. Reauthorize after scope changes. With the shared callback/tunnel running, open [the existing authorization URL](https://zoom.us/oauth/authorize?response_type=code&client_id=Bxu8tCqbQdeUqCaOV39aZA&redirect_uri=https://dev-callbacks.arcturus-labs.com/zoom/oauth), review permissions and choose **Allow**. `/zoom/oauth` updates the existing token store; no copying tokens or `.env` changes. RTMS reception itself does not read that store.
5. In account/admin Settings, permit sharing realtime meeting content with apps. Profile Settings → **Zoom Apps** → **Auto-start apps that access shared realtime meeting content** → **+ Choose an app to auto-start** → select this app → Save. Host approval/participant notifications still apply.
6. Test a private meeting you host with synthetic conversation, ideally not cloud-recorded (existing recording automation can update Peeps/delete recordings). Start receiver first; verify waiting→live, two speakers, pause/resume and end. Browser opening displays RTMS; it does not start it. Allow 1–2 minutes for subscription changes to propagate.

**Verified setup so far:** John confirmed Development credentials, added the three events and reauthorized. RTMS transcript scope and retained recording-file access were verified without exposing tokens. Actual auto-start, entitlement and live transcription still require a real private meeting; synthetic tests are not proof of Zoom activation.

## Cloudflare

**Do not change Cloudflare.** The existing `dev-callbacks.arcturus-labs.com` hostname/tunnel already targets **`http://localhost:8787`**. The new `/zoom/rtms` route is mounted there alongside recording/OAuth. No extra path rule, hostname, origin change or forwarding process is required. Never publish8788: it contains local history/live pages and APIs. Code guards also reject public Host/proxy/Origin requests if a private request is forwarded accidentally. The temporary compatibility bridge and old standalone8789/8790 live service are retired.

## Recovery and limits

Transcript-only WS type 8; handshake 1/2 then 3/4, ready ACK7 on signaling; transcript packets17; keepalive12→13 on both sockets. Automatic event7 is received, not subscribed to. Stream/session pause survives transport recovery until explicit resume. Both connections have watchdogs and bounded retries (3/6/12s); signaling/media failures reconnect appropriately. Exhaustion visibly requires stop/restart RTMS in Zoom. Reconnect gaps cannot be recovered; refreshing the browser cannot create a Zoom stream. Persisted page restore reopens the local SSE connection.

Only validated `wss://*.zoom.us:443` endpoints, normal TLS, no redirects/URL credentials, unencrypted transcript JSON. Unsupported/encrypted endpoints fail visibly. One meeting at a time; max 2,000 rows/512 KiB, 8 viewers, bounded dedup; old lines discarded visibly, slow viewers reconnect for a snapshot. No localStorage, analytics, transcript files or console logging. Explicitly copied clipboard and OS/browser memory are outside persistence guarantees.

## Isolated demo/tests

```sh
npm ci --prefix live
LIVE_WEBHOOK_PORT=18789 LIVE_UI_PORT=18790 node live/scripts/demo.mjs
# Open http://127.0.0.1:18790/live ; Ctrl-C stops only this demo.
npm test
npm run test:browser                   # Both private mini-apps on18788, callbacks18787
npm --prefix live test
npm --prefix live run test:browser
```

Demo uses fake credentials, an ephemeral fake Zoom WS server and synthetic text; no `.env`, Zoom, Pi or vault access. Its separate test listeners are not the production deployment. Observe matching speaker/text colors, literal markup inert, selection stable while updates arrive, scroll pause/resume, copy, refresh snapshot, clear and disconnect. Application tests verify separate public/private listener routing and private rejection for spoofed Host, forwarding, Origin/site and non-loopback peers.

Sources: [WS quickstart](https://developers.zoom.us/docs/rtms/meetings/quickstart-websockets/), [protocol](https://developers.zoom.us/docs/rtms/event-reference/universal-events/), [recovery](https://developers.zoom.us/docs/rtms/meetings/failover-reconnection/), [scopes](https://developers.zoom.us/docs/rtms/meetings/add-features/), [auto-start](https://developers.zoom.us/docs/rtms/meetings/quickstart/).
