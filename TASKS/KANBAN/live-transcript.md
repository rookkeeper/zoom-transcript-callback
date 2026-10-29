---
status: blocked
---
# Live Zoom transcript — software ready, real-meeting QA pending

Memory-only RTMS viewer for meetings John hosts; selectable speaker-colored names/text, refresh snapshot, no saving. Recording/Pi/Peeps core unchanged. Final user direction: separate cores, one process with original public8787/local8788 listeners; no Cloudflare changes. Historical standalone plan was superseded by [completed routing work](../COMPLETE/2026-10-29-single-port-routing/outcome.md).

Current viewer: http://127.0.0.1:8788/live . Existing Main LaunchAgent starts both mini-apps. Old standalone live agent and temporary forwarding removed. Actual public signed RTMS validation returns200 directly through unchanged Cloudflare→8787. Public private paths404, forwarded private requests403. Validation:19 live node tests,3 live browser tests,60 root node tests,3 root browser tests pass.

John confirmed Development credentials, added Meeting RTMS started/stopped/interrupted events and reauthorized. RTMS transcript scope and retained recording-file scope verified without displaying tokens. Shared root .env unchanged; no credits purchased. Setup: [live README](../../live/README.md).

**Remaining acceptance gates:** confirm subscription saved/validated in Zoom, entitlement/credits, sharing permission and host auto-start; operate a private non-recorded two-speaker meeting and verify live text/pause/end. No actual live Zoom stream claimed. Do not process production assets for QA.

History/artifacts: [brainstorm](../WIP/2026-10-29-live-transcript/brainstorm.md), [execution](../WIP/2026-10-29-live-transcript/todos.md), [historical standalone outcome](../WIP/2026-10-29-live-transcript/outcome.md). Worker implementation/review completed and merged; original worktree/branch cleaned. Orchestrator owns external activation.
