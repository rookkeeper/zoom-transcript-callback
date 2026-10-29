# Single-port routing

User: separate mini-app cores, shared routing/process, all on **8788**, no Cloudflare changes. User confirms repository's 8787 tunnel description is stale. Strict code-enforced local-only private routes required. Explicit direct-main override; main clean at start. Conversation settles scope; no further Q&A or user-attended gate requested.

Use thin composition, shared local-access boundary, reusable live handlers, recording/history core unchanged. Preserve standalone synthetic demo tests but normal deployment starts everything once. No production Pi/recording fake callbacks for QA. Stop/restart only owned services with no active jobs. Verify signed endpoint validation locally and publicly; cannot claim live RTMS without private meeting. Update existing live task activation evidence after real probes.

QA: node tests with in-memory DB and fake credentials; actual single HTTP listener + SSE, signed three-public-route paths and guarded private paths, spoofed Host/proxy/Origin/site. Independent isolated service and browser on ephemeral/high port, fake live text, observe both UIs; never touch production assets. Existing and live browser suites pass. Production startup smoke on 8788, old listeners closed; public signed CRC probes must reach appropriate app, private public-host requests must be denied. No secrets/transcript logging.

## Final user decision — supersedes single-port scope

After learning the original server already used two ports, John chose to retain that layout. Primary requirements: **no Cloudflare changes and secure private pages**, not port consolidation. Keep one process and independent mini-app cores; public callbacks/OAuth/RTMS on8787, both local UIs/APIs on8788. Remove temporary forwarding, keep shared local-access checks, update docs. User authorized choosing a targeted fix rather than reverting useful RTMS work, and direct-main execution remains approved. Only speak completion when completely finished, tersely. Routing acceptance is independent of the still-unverified real Zoom stream.
