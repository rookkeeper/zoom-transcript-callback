# Single-port routing

User: separate mini-app cores, shared routing/process, all on **8788**, no Cloudflare changes. User confirms repository's 8787 tunnel description is stale. Strict code-enforced local-only private routes required. Explicit direct-main override; main clean at start. Conversation settles scope; no further Q&A or user-attended gate requested.

Use thin composition, shared local-access boundary, reusable live handlers, recording/history core unchanged. Preserve standalone synthetic demo tests but normal deployment starts everything once. No production Pi/recording fake callbacks for QA. Stop/restart only owned services with no active jobs. Verify signed endpoint validation locally and publicly; cannot claim live RTMS without private meeting. Update existing live task activation evidence after real probes.

QA: node tests with in-memory DB and fake credentials; actual single HTTP listener + SSE, signed three-public-route paths and guarded private paths, spoofed Host/proxy/Origin/site. Independent isolated service and browser on ephemeral/high port, fake live text, observe both UIs; never touch production assets. Existing and live browser suites pass. Production startup smoke on 8788, old listeners closed; public signed CRC probes must reach appropriate app, private public-host requests must be denied. No secrets/transcript logging.
