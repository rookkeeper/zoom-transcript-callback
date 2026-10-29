# Brainstorm: isolated live transcript

Official task: TASKS/KANBAN/live-transcript.md
Planning directory: TASKS/WIP/2026-10-29-live-transcript/
Execution plan: [todos.md](./todos.md)
Status: approved for implementation

## User foundation and decisions (chat)

John wants to extend the existing Zoom General app with RTMS, but not interweave its implementation with recording harvesting. Only meetings he hosts. No saving transcripts. Speaker names and their text should be color-coded consistently and selectable. Open a local browser page while hosting and see incoming transcription. Agreed architecture: separate Node process with public POST /zoom/rtms listener (8789) and private GET /live plus GET /api/live/stream SSE listener (8790), separate code and tests. Tunnel does routing, not a shared Node router. Existing listeners 8787/8788, OAuth callback, database, recording pipeline and Pi remain unchanged. Root .env is shared; no OAuth token-store sharing is needed for receiving streams. Browser refresh gets current in-memory transcript, new meeting clears prior state, process restart loses it.

User explicitly authorized execution to completion and spoken completion with say. User authorized committing existing /SCRATCH/ ignore change; committed 1c2d4eb before work. No requested attended QA gate. Minimal framework-free UI consistent with repo, no WebMCP or embedded Zoom app in this slice. Auto-scroll pauses on upward scroll/selection. Copy text, waiting/live/paused/disconnected/ended status. Do not promise recoverable historical gaps.

## Scope and acceptance

Separate live/ package/directory with own dependency manifest if useful; no imports from src/. Share env only. Signed webhook validation, URL validation, bounded raw bodies, freshness checking, deliberate untrusted fields. Transcript-only handshake; proper signaling/media ACKs, keepalives, shutdown and bounded reconnect handling. Idempotent repeated starts/stops and stale-event handling. No transcript/credential logging or disk persistence. Private UI rejects forwarded/nonlocal host/origin requests; public listener never exposes transcript. UI renders untrusted text safely. Memory/backpressure bounded and limits visible/documented. Prefer direct ws protocol over native SDK to avoid native logging and platform complexity.

## Sources

- https://developers.zoom.us/docs/rtms/meetings/add-features/ — existing user-managed General app, transcript scope, events.
- https://developers.zoom.us/docs/rtms/meetings/quickstart-websockets/ — text-only WS example (do NOT copy its unsafe logging).
- https://developers.zoom.us/docs/rtms/event-reference/universal-events/ — authoritative protocol fields.
- https://developers.zoom.us/docs/rtms/meetings/failover-reconnection/ — retry/failover.
- https://developers.zoom.us/docs/rtms/meetings/quickstart/ — account/profile Zoom Apps auto-start steps.

## QA plan

Unit/integration tests with fake credentials, fake Zoom WebSockets, actual HTTP/SSE, validation/rejections/lifecycle/failures. Isolated demo process using synthetic text and separate ports; independently open real browser, inspect colors/text/scroll/refresh/status/copy, test public/private separation. Run existing npm test and browser suite if feasible; never start existing run-server.sh or send existing fake callbacks (can invoke Pi/delete assets). Inspect setup availability without printing secrets. Zoom Marketplace billing/scope/authorization changes may require John. Do not purchase credits; mark actual live meeting verification blocked if unavailable. Provide exact setup/start/inspect/stop instructions. No claim of a live Zoom test without one.

## Agreement

Conversation has resolved product/architecture questions. User: 'get started and finish everything.' Orchestrator accepts implementation scope and will proceed without additional brainstorming. External setup blockers must be reported explicitly.

## Lane classification

One tightly coupled new live-transcript seam (protocol → in-memory state → viewer) with one writer; splitting would add artificial contracts and startup/test ownership overlap. Parent owns local account/tunnel investigation, independent browser QA and integration. Worker has no authority to change external services, secrets, existing src/ui, or run production pipeline.
