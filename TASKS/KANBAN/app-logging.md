---
id: "app-logging"
title: "Consistent application logging with actionable processor errors"
status: triage
created: "2026-10-01"
touched: "2026-10-01"
tags: [logging, diagnostics]
---

# Consistent application logging with actionable processor errors

## Desired outcome

Any failed activity row must lead to its cause within one lookup: the UI/ledger error names the failure, and one structured application log carries the full error (message, stack, meeting/request IDs) for every pre- and post-spawn failure. Clean up the current split across `console.error`, two JSONL logs, and generic messages.

## Acceptance criteria

- [ ] One conventional application log (single destination, filterable structured JSONL) replaces the current split across stderr log / Pi JSONL / ledger for operational failures.
- [ ] Every failure log line carries the error message — and stack where useful — plus `requestId`/`meetingId`; no bare `code`-only lines.
- [ ] Pre-spawn failures (index/download errors like "No completed transcript") surface an actionable `error` on the activity row instead of "Processor failed; inspect execution log".
- [ ] Full cleanup in one go: documented logging convention (module, format, destination) covering callback, meeting job, archive, and processor paths; no remaining bare `console.error` for operational failures.
- [ ] No-transcript and other pre-spawn failures fail fast (no auto-retry).
- [ ] `npm test` passes; failure paths covered by tests.

## Out of scope (separate stories)

- Failure-enum expansion (missing-transcript / timeout / media-vs-transcript states) — captured in `BACKLOG.md`, do after logging.
- `success-ledger-all-exits` overlap — to be discussed separately before implementation.

## Planning artifacts

Planning directory: `TASKS/WIP/app-logging/`

## Planning and implementation checklist

- [ ] Review relevant PRODUCT/ and ARCHITECTURE/ guidance.
- [ ] Orchestrator: create brainstorm.md and todos.md from templates, gather user details, and iterate inline Q&A until both parties agree the requirements and QA plan.
- [ ] Orchestrator: populate the execution checklist and verify both WIP files before dispatch.
- [ ] Worker: review all TASKS/WIP/app-logging documents (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Run agreed tests and independent product QA.
- [ ] Record outcome and evidence; update this card and link completed artifacts.

## Notes / activity

- 2026-10-01: triaged from the "Ride Along – John builds" failure (meeting `87850645500`). Triggering diagnosis in `TASKS/WIP/app-logging/brainstorm.md`.
- 2026-10-01: user decisions — full cleanup in one go; pre-spawn failures fail fast; consolidate into one conventional filterable application log; QA deferred (not implementing immediately, no retry of the dead meeting — Zoom shows "Unable to transcribe", transcript is gone).
- Relationship: complements `success-ledger-all-exits` (per-Pi ledger rows, unmerged branch); overlap to be discussed separately. Failure-enum expansion split out to `BACKLOG.md`.
