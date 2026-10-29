---
status: blocked
---
# Isolated live Zoom transcript

Build a standalone RTMS transcript viewer for meetings John hosts. Speaker names and text use consistent per-speaker colors; selectable live text, no persistence. Existing recording/Pi/Peeps service remains unchanged. Share only root .env credentials and ingress infrastructure.

Artifacts: [plan](../WIP/2026-10-29-live-transcript/brainstorm.md), [execution](../WIP/2026-10-29-live-transcript/todos.md).

Acceptance: signed RTMS lifecycle webhook on independent public listener; loopback-only UI/SSE on separate listener; in-memory snapshot for browser refresh; isolated start/demo/tests; setup and tunnel instructions. Live Zoom verification depends on account entitlement, scopes, reauthorization, auto-start and a private test meeting. Do not purchase credits or process production recordings.

Owner: orchestrator; implementation running in `.worktrees/live-transcript` on `live-transcript`, base `75fc840`. Workflow `087a0880-cb62-4da0-869d-4518d53bdac1`. Harmless workspace probe verified exact cwd/branch/clean HEAD and committed plan before implementation. No nested workers.

Activation progress: John confirmed the app uses Development credentials, added Meeting RTMS started/stopped/interrupted events in Development, and reauthorized successfully. Orchestrator verified the updated OAuth grant includes `meeting:read:meeting_transcript` and retains recording-file list access (no tokens displayed). Cloudflare connector is remotely token-managed; same hostname/tunnel is reused, but exact `/zoom/rtms` path routing to 8789 still needs dashboard configuration. Auto-start, entitlement/credits, endpoint validation and a private live-meeting test remain unverified. Shared credentials exist (values not printed); new default ports 8789/8790 are free. No credits purchased.

Software integrated into main; original isolated service subsequently replaced by shared routing/process on8788 per user request. Current viewer: http://127.0.0.1:8788/live . Current validation:19 live tests,3 live browser,60 root tests,3 root browser pass. Main LaunchAgent starts both apps; old standalone live agent removed. Public signed `/zoom/rtms` CRC now200 through temporary public-only8787→8788 compatibility forwarding, because deployment proved the existing Cloudflare origin is actually8787. No Cloudflare edits. Exactly-one-port origin migration remains blocked; see [current shared-server outcome](../WIP/2026-10-29-single-port-routing/outcome.md). Zoom endpoint subscription save/validation, auto-start/entitlement and private real-meeting QA remain unverified. No live Zoom run claimed. [Historical standalone outcome](../WIP/2026-10-29-live-transcript/outcome.md).
