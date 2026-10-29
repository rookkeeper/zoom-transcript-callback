---
status: in-progress
---
# Isolated live Zoom transcript

Build a standalone RTMS transcript viewer for meetings John hosts. Speaker names and text use consistent per-speaker colors; selectable live text, no persistence. Existing recording/Pi/Peeps service remains unchanged. Share only root .env credentials and ingress infrastructure.

Artifacts: [plan](../WIP/2026-10-29-live-transcript/brainstorm.md), [execution](../WIP/2026-10-29-live-transcript/todos.md).

Acceptance: signed RTMS lifecycle webhook on independent public listener; loopback-only UI/SSE on separate listener; in-memory snapshot for browser refresh; isolated start/demo/tests; setup and tunnel instructions. Live Zoom verification depends on account entitlement, scopes, reauthorization, auto-start and a private test meeting. Do not purchase credits or process production recordings.

Owner: orchestrator; implementation running in `.worktrees/live-transcript` on `live-transcript`, base `75fc840`. Workflow `087a0880-cb62-4da0-869d-4518d53bdac1`. Harmless workspace probe verified exact cwd/branch/clean HEAD and committed plan before implementation. No nested workers.

Activation blockers found by orchestrator: current OAuth grant lacks `meeting:read:meeting_transcript`; managed browser is signed out of Zoom Marketplace. Cloudflare connector is remotely token-managed, so routing requires dashboard access. Shared credentials exist (values not inspected or printed); new default ports 8789/8790 are free. No account settings changed and no credits purchased.
