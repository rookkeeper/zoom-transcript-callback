---
status: in-progress
---
# Isolated live Zoom transcript

Build a standalone RTMS transcript viewer for meetings John hosts. Speaker names and text use consistent per-speaker colors; selectable live text, no persistence. Existing recording/Pi/Peeps service remains unchanged. Share only root .env credentials and ingress infrastructure.

Artifacts: [plan](../WIP/2026-10-29-live-transcript/brainstorm.md), [execution](../WIP/2026-10-29-live-transcript/todos.md).

Acceptance: signed RTMS lifecycle webhook on independent public listener; loopback-only UI/SSE on separate listener; in-memory snapshot for browser refresh; isolated start/demo/tests; setup and tunnel instructions. Live Zoom verification depends on account entitlement, scopes, reauthorization, auto-start and a private test meeting. Do not purchase credits or process production recordings.

Owner: orchestrator; implementation worker to be launched in .worktrees/live-transcript on live-transcript. No nested workers.
