# Restore established two-port routing (direct-main user override)

The checklist below records the earlier single-port attempt. Final user decision retains public8787/local8788, no Cloudflare changes; completion checklist is appended.

- [x] Inspect clean main, existing composition/config/scripts/tests; agree 8788 and no Cloudflare change.
- [x] Add regression tests proving one server mounts both cores and denies nonlocal/forwarded/hostile private access. ~ Observed missing-handler-export red, then green; private peers/Host/forwarding/origin/site covered.
- [x] Extract reusable HTTP handlers from each mini-app; shared routing guard; integrate live lifecycle and single startup/shutdown.
- [x] Update startup/dependencies/env contract and affected tests. ~ Root installs ws; SERVER_PORT defaults8788, legacy ports ignored; live start aliases shared startup.
- [x] Update repo architecture/product/README/Zoom reference to 8788 shared listener.
- [x] Run node/browser suites and independent isolated browser/HTTP QA. ~ 60 root tests,3 root browser,19 live tests,3 live browser pass; managed browser and independent raw HTTP on18788 confirm both UIs, private403, signed public CRC200. No real Zoom/Pi run.
- [x] Check no active jobs, retire independent live LaunchAgent, restart owned main process and verify local/public paths. ~ Root runs8788; actual Cloudflare origin8787 caused502, temporary public-only bridge restored signed CRC200. Public private paths404. No Cloudflare edits; final single-port migration blocked.
- [x] Record outcome, tests, deployment evidence and residual live-Zoom gate; commit scoped changes. ~ outcome.md documents temporary bridge and required owner decision; task was WIP/blocked at that point rather than claiming one-port completion.

## Final two-port completion

- [x] Confirm final user scope: public8787, local8788, one process, no Cloudflare change.
- [x] Add failing two-listener isolation regression, implement separate mounts and restore CALLBACK_PORT/EVENTS_PORT configuration.
- [x] Preserve live/history private guard and update current setup/architecture/docs.
- [x] Run60 root tests,3 root browser tests,19 live tests,3 live browser tests; all pass.
- [x] Independent isolated browser/HTTP QA: both private UIs200, public private paths404, forwarded private requests403, signed public CRC200.
- [ ] Remove verified temporary forwarding, restart owned service with no active jobs, verify real local/public endpoints and same PID on both listeners.
- [ ] Record final outcome, archive completed routing task, commit and announce tersely.
