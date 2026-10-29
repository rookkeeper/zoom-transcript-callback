---
status: blocked
---
# Single-port routing

User explicitly authorized direct-on-main execution for this quick update and confirmed **8788** is the existing Cloudflare destination. No Cloudflare changes. Preserve independent recording/live application cores; share routing/composition and strict private access guard. Public whitelist: POST /zoom/transcripts, GET /zoom/oauth, POST /zoom/rtms. Private history/live UI and APIs require loopback peer, exact local Host, no forwarding headers, same Origin/site. Unknown routes default 404. One process/listener on 8788; retire deployed standalone live service. Preserve unrelated changes, secrets and processing state. Update docs and run tests plus isolated real browser/HTTP QA before restart; check no unfinished jobs.

Plan/outcome: TASKS/WIP/2026-10-29-single-port-routing/ . No worktree/delegation per user override.

Code, docs, tests and local shared-server deployment complete at e4d2e14. App listens only8788. Deployment disproved the presumed tunnel origin: connector log shows localhost:8787 and public requests502 until temporary public-only8787→8788 forwarding was started (PID39688, `/tmp/zoom-public-origin-compat.mjs`). Public signed recording/RTMS validation now200; private public paths404. No Cloudflare changes. **Exactly one listening port remains blocked on origin migration to8788**; do not remove bridge before successful public probes against the new origin.
