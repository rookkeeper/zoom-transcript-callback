---
status: in-progress
---
# Restore established public/private routing

Final user decision supersedes the attempted single-port migration: retain original public8787/local8788 in one process. No Cloudflare changes. Mount new RTMS webhook alongside existing recording/OAuth public routes; mount live viewer alongside history privately. Independent cores, shared composition/access guard. Remove temporary forwarding and old standalone live process. Direct-main user override; no worktree/delegation.

Artifacts retain original dispatch name for history: [plan](../WIP/2026-10-29-single-port-routing/brainstorm.md), [execution](../WIP/2026-10-29-single-port-routing/todos.md), [outcome](../WIP/2026-10-29-single-port-routing/outcome.md).

Acceptance: public listener never mounts private paths; local listener loopback-only plus peer/Host/forwarding/Origin/site checks. Existing Cloudflare originlocalhost:8787 unchanged. Local both UIs200, public signed CRCs200, public private paths404; remove temporary bridge. Real Zoom streaming remains a separate feature-activation gate.
