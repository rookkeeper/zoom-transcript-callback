---
id: "auto-retry"
title: "Auto-retry stalled Pi jobs with backoff"
status: complete
created: "2026-09-17"
touched: "2026-09-17"
tags: [retry, pi, ui]
---

# Auto-retry stalled Pi jobs with backoff

## Desired outcome

Recover from Pi stalls and timeouts without manual intervention, and stop the idle watchdog from killing healthy `--print` jobs that emit nothing until they finish.

## Acceptance criteria

- [x] Post-spawn failures retry with backoff, up to `PI_MAX_ATTEMPTS`, as a fresh activity row linked by `retryOf`.
- [x] Pre-spawn failures (Pi could not start) are not retried.
- [x] Idle watchdog default raised 3 min → 10 min (`PI_IDLE_TIMEOUT_MS`).
- [x] Failed rows are distinguishable in the events UI, with local times and an elapsed column.
- [x] README and `.env.example` document the new knobs.

## Planning artifacts

Completed artifacts: `TASKS/COMPLETE/auto-retry/`

## Planning and implementation checklist

- [x] Implement `src/retry.mjs` and wire it through the callback handler.
- [x] Cover retry and non-retry paths with tests.
- [x] Record outcome and evidence.

## Notes / activity

Merged as PR #1 (`fa18826`). `scripts/manual-retry.mjs` was kept as an admin escape hatch and proved out on three real stalled meetings. Deferred: Pi event-stream progress parsing and overall timeout changes.
