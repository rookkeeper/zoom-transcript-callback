# Live transcript: software delivered, activation blocked

## Delivered (2026-10-29)

Integrated isolated `live/` service into local main; no remote push. Existing recording/Pi/Peeps source, UI, scripts, root package and runtime state untouched. Shared root `.env` not modified. Setup/operation reference: [live/README.md](../../../live/README.md).

Public webhook listener: `127.0.0.1:8789`, only `POST /zoom/rtms`. Private viewer: http://127.0.0.1:8790/live . Separate launch-at-login service installed at `~/Library/LaunchAgents/com.rookkeeper.zoom-live-transcript.plist`, label `com.rookkeeper.zoom-live-transcript`, direct Node PID 29945 at verification. It reads existing credentials without embedding them in the plist. Do not restart the recording service to manage this feature.

19 live tests, 3 live Chromium tests, 58 existing root tests and 2 existing root Chromium tests passed under parent validation. Worker also ran dependency audit (zero vulnerabilities). Independent parent synthetic browser walkthrough confirmed selectable colored speaker/text, inert untrusted markup, selection preserved during updates, refresh snapshot, pause behavior and privacy boundaries. Clipboard fallback observed under restricted managed-browser permission; Playwright clipboard test passes. Reviewer's two P1 findings corrected and independently re-reviewed; no runtime blockers remained. Simulated persisted-page lifecycle test also added; not a claim of actual BFCache use.

## Actual activation evidence

John confirmed Development credentials, selected three Meeting RTMS events in Development, and reauthorized. Parent verified `meeting:read:meeting_transcript` is granted and recording-file access retained, without printing tokens. New service starts with real shared credentials, local viewer returns 200 and shows Waiting with zero retained rows. Signed local endpoint validation challenge returns 200 with verified HMAC response.

**Public signed validation probe to `https://dev-callbacks.arcturus-labs.com/zoom/rtms` returns 404**, so tunnel path routing is not active. Existing tunnel is remote token-managed; no local config change can fix that. No credits purchased, no real Zoom meeting/Pi/vault/cloud-deletion run, no transcript saved. Do not call the overall feature live-verified yet.

## Remaining activation steps

1. In existing Cloudflare tunnel dashboard, add same hostname `dev-callbacks.arcturus-labs.com`, exact path `^/zoom/rtms$`, service `http://127.0.0.1:8789`, ordered before existing same-host catch-all. Preserve existing recording/OAuth route to 8787; never expose 8790/8788.
2. Validate/save the Development app's RTMS event subscription endpoint, retaining existing recording subscription and secret.
3. Confirm Developer Pack entitlement/credits and host sharing permission. Do not purchase without approval.
4. Profile Settings → Zoom Apps → Auto-start apps that access shared realtime meeting content → select existing app.
5. Private meeting John hosts: receiver running first, two test speakers, confirm text/name/colors/pause/resume/end and existing pipeline unaffected. Avoid production recording assets; existing recording automation can write notes/delete recordings, so use an intentionally non-recorded isolated RTMS meeting if supported.

## Operation

- Open http://127.0.0.1:8790/live . Browser opens display, not Zoom RTMS start.
- Inspect: `launchctl print "gui/$(id -u)/com.rookkeeper.zoom-live-transcript"`.
- Stop: `launchctl bootout "gui/$(id -u)/com.rookkeeper.zoom-live-transcript"` (memory lost).
- Start: `launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.rookkeeper.zoom-live-transcript.plist"`.
- Reproduce synthetic QA: `LIVE_WEBHOOK_PORT=18789 LIVE_UI_PORT=18790 node live/scripts/demo.mjs`, open 18790/live, Ctrl-C stops. No `.env` or Zoom access in demo.
- Tests: `npm --prefix live test`; `npm --prefix live run test:browser`.

Keep task in blocked activation state/WIP until real acceptance gates pass; software is integrated and reversible as a dedicated merge commit. No completed-card archival yet.
