# Task execution: isolated live transcript

Official task: TASKS/KANBAN/live-transcript.md
Planning directory: TASKS/WIP/2026-10-29-live-transcript/
Worker/session: implementation worker (live-transcript branch; report in orchestrator artifacts)
Worktree: .worktrees/live-transcript
Branch: live-transcript
Base: 75fc840 (committed planning)

## Checklist

- [x] Review task plan, project instructions, PRODUCT/, and ARCHITECTURE/.
- [x] Create planning brainstorm/todos, mention in card, record chat decisions and execution authorization.
- [x] At dispatch move planning to TASKS/WIP/2026-10-29-live-transcript and update links.
- [x] Review all WIP documents (worker).
- [x] Verify clean committed main, provision matching worktree, verify launch using harmless probe (orchestrator).
- [x] Verify assigned worktree/branch before edits; no nested workers.
- [x] Confirm manageable scope, escalate material decisions.
- [x] Test-first signed webhook and independent HTTP/private SSE boundary.
- [x] Test-first transcript-only Zoom protocol and lifecycle including failures, duplicate events, keepalive and shutdown.
- [x] In-memory state and colored selectable viewer with snapshot, copy, scroll and status behavior.
- [x] Isolated start/demo/stop affordances, no production port killing or transcript logging.
- [x] Document env vars in .env.example, setup, scopes, billing, auto-start, tunnel and independent operation.
- [x] Run focused tests and existing tests; record actual results.
- [ ] Independently operate synthetic demo in real browser (parent); inspect security boundaries and refresh.
- [x] Attempt available external setup safely; record missing account access/credits/approval. Live verification remains blocked until private Zoom test.
- [ ] Sync main, inspect diff, fix accepted review findings and repeat validation.
- [x] No user-attended walkthrough requested; no approval gate.
- [ ] Merge locally only when software validation is ready; no push.
- [ ] Record outcome and usage. Archive only if acceptance complete; otherwise keep explicit blocked activation state.
- [ ] Clean worktree when safe.


## Implementation evidence (worker)

- Verified cwd/branch `live-transcript`, clean HEAD `75fc840`, supplied launch probe, official card and both WIP documents. No nested workers or edits to existing `src/`, `ui/`, root scripts/package files, `.env`, account/tunnel settings, skills, or main checkout.
- Added separate `live/` package/lockfile, framework-free viewer, public signed webhook listener and private UI/SSE listener. New shared-root env reads audited in `.env.example`. Runtime logs only startup locations/generic errors, never content/credentials; no native SDK or transcript persistence.
- Protocol sources retrieved from official Zoom docs: WS quickstart, universal/session events, reconnection, webhook fields, data types, features/scopes and auto-start. Uses payload-root fields, sequence 1, transcript-only type 8, media handshake 4 → ready ACK 7 on signaling, keepalive 12→13 on both sockets. JSON accepts text/binary frames; malformed/binary non-JSON is ignored. Revocation clears retained text. Same-stream fresh start handles failover while exact redeliveries are ignored.
- TDD observed red: missing state/security modules (1 failure), then 3 green; missing RTMS module and HTTP module failed before implementation, then 8 green; missing config failed before implementation. Viewer first failed at Connecting instead of Live, then passed after implementation. Regression test for process-restart reused row IDs failed before adding a process epoch, then passed. Revocation test and binary-framed JSON test each failed first, then passed after fixes.
- Final focused validation: `npm --prefix live test` **18/18 pass** (actual HTTP, SSE, local fake Zoom WS, signatures/stale input, malformed signed bodies, handshake/ACK/keepalive, failover, interruption, pause/resume, bounded retries, shutdown, revocation, byte/row limits, viewer cap, actual burst backpressure, occupied-port safety).
- `npm --prefix live run test:browser` **2/2 pass** (real demo UI, literal markup, consistent colors, selection/scroll pause, clipboard, refresh, clear, process epoch regression).
- Root `npm test` **58/58 pass**, root `npm ci && npm run test:browser` **2/2 pass**. `npm audit --prefix live --omit=dev` found **0 vulnerabilities**. Dependency installation was confined to ignored node_modules; root manifest/lockfile unchanged.
- Independent worker operation (outside tests): launched direct Node synthetic demo on isolated **20789/20790**, inspected actual SSE snapshot (Live, 100 synthetic rows, epoch present), public stream route **404**, private forwarded and hostile-Origin requests **403**. Opened Chromium, inspected screenshot `/tmp/live-transcript-demo-worker.png` (matching speaker/name colors, legible layout), clicked Pause and observed `Auto-scroll paused`. This is synthetic QA, **not a live Zoom run**.
- Parent notified demo ready at `http://127.0.0.1:20790/live`, direct Node PID **25931**; stop only that owned process with `kill -TERM 25931` if still running. Reproduce safely: `LIVE_WEBHOOK_PORT=20789 LIVE_UI_PORT=20790 node live/scripts/demo.mjs` (Ctrl-C stops). Demo never reads `.env` or contacts Zoom and has no production URL-validation bypass flag.
- Setup/operation and independent walkthrough: `live/README.md`; authoritative product/architecture additions linked from indexes. Exact ingress path must precede broad same-host rules; never route private viewer port. Existing recording/Pi/Peeps flows untouched.

## Remaining gates / explicit limits

- **Parent independent browser QA and required reviewer gate remain pending.** Parent owns review findings, main synchronization, integration and task archival. Worker must not merge or archive.
- **Live Zoom verification is blocked pending parent-managed external setup and a private hosted test meeting**: entitlement/credits, transcript scope, event subscription, app reauthorization, sharing permission and auto-start. Worker made no external changes/purchases and did not inspect/print secrets or real transcripts. Synthetic demo is not proof of Zoom activation.
- Deliberately single active hosted meeting; retained state limited to 2,000 rows/512 KiB and bounded dedup windows. Historical gaps cannot be replayed. Only unencrypted transcript JSON over validated `wss://*.zoom.us:443` endpoints is supported; verify the actual account endpoint during activation. Exhausted recovery clearly requires Zoom RTMS stop/restart rather than silently promising recovery.


## Parent activation evidence and lifecycle follow-up

- Parent inspected setup safely: shared credentials are present, but the currently installed OAuth authorization lacks `meeting:read:meeting_transcript`. The managed Zoom Marketplace browser is signed out, so adding/reauthorizing the scope is blocked on account access. Cloudflare ingress is **remote token-managed**: a local ingress-file edit cannot activate the route; configure the remote tunnel's route ordering through the authorized management surface. No live Zoom test occurred; activation remains blocked.
- Added explicit fake-WS regression coverage for stream msg8 ACTIVE1 / INTERRUPTED2 / TERMINATING3 / TERMINATED4 / PAUSED5 / RESUMED6 (existing and new cases) and session msg9 STARTED2 / PAUSED3 / RESUMED4 / STOPPED5. Ordinary stops retain rows; session stop does not terminate the whole stream. New meetings clear retained text.
- Follow-up TDD observed **17 pass /1 fail**: session STOPPED5 with `stop_reason:8` initially retained text. Fixed immediate in-memory deletion and empty-snapshot broadcast for revoked sessions, accepting `reason` or `stop_reason` as documented by Zoom's differing table/example forms. Stream revocation and post-end revoked webhook deletion are also covered; ordinary ended meetings remain retained.
