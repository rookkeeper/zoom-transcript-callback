# Shared server: code delivered, final origin migration blocked

## Delivered

User-authorized direct-on-main change committed e4d2e14. Both mini-apps run under the existing `com.rookkeeper.zoom-transcript-callback` LaunchAgent on **127.0.0.1:8788**. Recording/RTMS cores stay separate; only composition, HTTP routing, process lifecycle and private-access guard are shared. Old independent live LaunchAgent unloaded and its plist removed. Old8789/8790 listeners closed; app no longer listens8787. `SERVER_PORT` is the canonical port (default8788); legacy CALLBACK_PORT/EVENTS_PORT ignored and audited env/docs updated. Root installs ws, so ordinary startup needs only root npm install/ci.

Public allowlist: POST /zoom/transcripts, GET /zoom/oauth, POST /zoom/rtms. History/live UI/APIs/assets require loopback peer, exact local Host, no proxy/Cloudflare hints, matching Origin/site. All supplied transcript text stays literal. Normal shutdown closes live sockets/SSE and drains accepted recording jobs. Existing recording/database/Pi business logic untouched. `live/README.md` documents feature setup and shared operation.

## Verification

- Test-first single-listener integration initially failed on missing handler export, then passed.
- 60 root node tests,3 root Playwright tests,19 live node tests,3 live Playwright tests passed.
- Root browser fixture now mounts both apps on one isolated port18788, synthetic state/in-memory database only. Parent independently opened /events and /live in managed Chromium, saw synthetic speaker/text; independent HTTP signed recording/RTMS CRC probes returned200. Forwarding and explicit public Host were denied403 on private routes. Raw http client used for explicit Host checks (Node fetch ignores attempted Host overrides).
- Before production restart, unfinished received/running activity count was0 (checked twice). Booted out only owned old services, then bootstrapped existing root LaunchAgent. App Node PID39369 at verification; local /events,/live,/api/events,/api/live/stream all200. Local signed recording and RTMS CRC responses validated200. No real recording processing or live Zoom meeting was triggered; CRCs only.

## Cloudflare discrepancy and temporary safety bridge

User believed current Cloudflare origin was8788 and asked not to change it. We initially documented that assumption. Deployment proved otherwise: with only8788 listening, every public route returned502. Redacted connector-log inspection found `http://localhost:8787`. No credentials, tokens, transcript content or raw log bodies were printed.

**Cloudflare was NOT changed.** To avoid leaving callbacks unavailable, parent launched temporary compatibility forwarding:

- Script: `/tmp/zoom-public-origin-compat.mjs`
- Direct Node PID: **39688** at verification
- Listener:127.0.0.1:8787 →127.0.0.1:8788
- Only the three public Zoom method/path pairs are forwarded, never UI/APIs; forwarding headers are preserved. No payload/error logging. Not a durable deployment artifact; no login agent installed for this temporary bridge.
- With bridge active, public signed `/zoom/transcripts` and `/zoom/rtms` validation both return200 with verified HMAC. Public `/events`, `/live`, `/api/events`, `/api/live/stream` return404 (rejected at bridge). Private guard on8788 independently returns403 for tunneled/spoofed requests.

**Exactly one listening port is not achieved yet:** main application is single-port8788, but old Cloudflare origin still needs the temporary8787 bridge. Owner decision required: migrate the existing Cloudflare origin to `http://127.0.0.1:8788` (no new route/hostname), verify signed callbacks and public private-route denial, then terminate the verified owned bridge process. Do not stop it first. Reboot can remove the temporary /tmp bridge; resolve migration before relying on unattended startup. Alternative is to keep a legacy origin listener, explicitly accepting two ports; no silent permanent change was made.

## Usage and next steps

- Local history: http://127.0.0.1:8788/events
- Live viewer: http://127.0.0.1:8788/live
- Root service: `launchctl print "gui/$(id -u)/com.rookkeeper.zoom-transcript-callback"`.
- Shared restart affects both apps and loses live memory; wait for recording jobs first.
- RTMS scope is authorized. Still confirm Zoom endpoint subscription saved/validated, entitlement/credits, host sharing/auto-start, then private non-recorded test meeting. No live Zoom claim.

Task remains blocked/WIP on final origin migration. No remote push, no Cloudflare edits, no credits purchased, no transcript persisted by live feature.
