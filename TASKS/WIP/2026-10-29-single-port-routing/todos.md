# Single-port execution (direct-main user override)

- [x] Inspect clean main, existing composition/config/scripts/tests; agree 8788 and no Cloudflare change.
- [x] Add regression tests proving one server mounts both cores and denies nonlocal/forwarded/hostile private access. ~ Observed missing-handler-export red, then green; private peers/Host/forwarding/origin/site covered.
- [x] Extract reusable HTTP handlers from each mini-app; shared routing guard; integrate live lifecycle and single startup/shutdown.
- [x] Update startup/dependencies/env contract and affected tests. ~ Root installs ws; SERVER_PORT defaults8788, legacy ports ignored; live start aliases shared startup.
- [x] Update repo architecture/product/README/Zoom reference to 8788 shared listener.
- [x] Run node/browser suites and independent isolated browser/HTTP QA. ~ 60 root tests,3 root browser,19 live tests,3 live browser pass; managed browser and independent raw HTTP on18788 confirm both UIs, private403, signed public CRC200. No real Zoom/Pi run.
- [x] Check no active jobs, retire independent live LaunchAgent, restart owned main process and verify local/public paths. ~ Root runs8788; actual Cloudflare origin8787 caused502, temporary public-only bridge restored signed CRC200. Public private paths404. No Cloudflare edits; final single-port migration blocked.
- [x] Record outcome, tests, deployment evidence and residual live-Zoom gate; commit scoped changes. ~ outcome.md documents temporary bridge and required owner decision; task remains WIP/blocked rather than claiming one-port completion.
