---
status: complete
---
# Restore established public/private routing

Final user decision supersedes the attempted single-port migration: retain original public8787/local8788 in one process, with independent mini-app cores and shared composition/access guard. No Cloudflare changes. RTMS joins existing recording/OAuth public routes; live viewer joins local history. Direct-main user override honored.

Artifacts: [plan/history](brainstorm.md), [execution](todos.md), [verified outcome](outcome.md).

Complete: targeted fix f19f37d; all node/browser suites pass and independent isolated QA performed. Same deployed Node PID44941 owns8787/8788. Public signed recording/RTMS CRC200, public private routes404, forwarded private requests403, local UIs200. Temporary compatibility process/script/log removed and old standalone live agent retired. Existing Cloudflare originlocalhost:8787 untouched. No remote push.

Actual live Zoom transcription remains the separate live-feature activation gate; no real Zoom meeting claimed here.
