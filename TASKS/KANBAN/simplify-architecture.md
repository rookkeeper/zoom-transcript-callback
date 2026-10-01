---
id: "simplify-architecture"
title: "Simplify the server architecture before the logging cleanup"
status: triage
created: "2026-10-01"
touched: "2026-10-01"
tags: [architecture, refactor]
blocked_by: []
---

# Simplify the server architecture before the logging cleanup

## Desired outcome

Reduce the number of layers / collaborators a request passes through (`callback → retry → activities → meetingJob → processor → pi`, plus `assetArchive` / `zoomDownloads` overlap) so the full logging cleanup (`app-logging`) lands on a small, legible structure instead of cementing the current sprawl. Must precede `app-logging`.

## Acceptance criteria

- [ ] Documented target structure: what layers remain, what each owns, and what gets merged or retired (candidate overlaps: `retry.mjs` vs `meetingJob.mjs` orchestration, `assetArchive.mjs` vs `zoomDownloads.mjs` download paths — see BACKLOG download-redundancy item, `activities.run` error handling vs processor errors).
- [ ] No behavior change: `npm test` passes; existing suites updated only for moved interfaces.
- [ ] Sequencing: this merges before `app-logging` starts.

## Planning artifacts

To be created at kickoff (`TASKS/WIP/simplify-architecture/` with `brainstorm.md` + `todos.md`). Deliberately no WIP directory yet — per user instruction, brainstorm only when ready to start the task.

## Planning and implementation checklist

- [ ] Review relevant PRODUCT/ and ARCHITECTURE/ guidance.
- [ ] Orchestrator: create brainstorm.md and todos.md from templates, gather user details, and iterate inline Q&A until both parties agree the requirements and QA plan.
- [ ] Orchestrator: populate the execution checklist and verify both WIP files before dispatch.
- [ ] Worker: review all TASKS/WIP/simplify-architecture documents (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Run agreed tests and independent product QA.
- [ ] Record outcome and evidence; update this card and link completed artifacts.

## Notes / activity

- 2026-10-01: created at user's request as a prerequisite to `app-logging`. Card only, no brainstorming yet.
- The "Ride Along – John builds" diagnosis (meeting `87850645500`, permanently untranscribable) illustrated the cost: tracing one failure crossed `callback.mjs` → `retry.mjs` → `activities.mjs` → `meetingJob.mjs` → `assetArchive.mjs`, with the error message lost at the `activities.run` boundary.
