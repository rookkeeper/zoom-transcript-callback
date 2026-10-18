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

To be created at kickoff (`TASKS/PLANNING/simplify-architecture/` with `brainstorm.md` + `todos.md`). Deliberately no planning directory yet — per user instruction, brainstorm only when ready to start the task. Move to dispatch-dated WIP only when dispatched; see [task guidance](../README.md).

## Planning and implementation checklist

- [ ] Review relevant PRODUCT/ and ARCHITECTURE/ guidance.
- [ ] Orchestrator: create brainstorm.md and todos.md from templates, gather user details, and iterate inline Q&A until both parties agree the requirements and QA plan.
- [ ] Orchestrator: after explicit brainstorming completion, populate the execution checklist and verify both planning documents; move to TASKS/WIP/YYYY-MM-DD-simplify-architecture/ at dispatch and update path mentions.
- [ ] Worker: review all documents at the supplied dispatch-dated WIP path.
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Run agreed tests and independent product QA.
- [ ] If requested, obtain approval of the isolated user walkthrough before integration.
- [ ] Record outcome and evidence; move artifacts and this card to TASKS/COMPLETE/YYYY-MM-DD-simplify-architecture/ with the same dispatch date; update links.

## Notes / activity

- 2026-10-01: created at user's request as a prerequisite to `app-logging`. Card only, no brainstorming yet.
- The "Ride Along – John builds" diagnosis (meeting `87850645500`, permanently untranscribable) illustrated the cost: tracing one failure crossed `callback.mjs` → `retry.mjs` → `activities.mjs` → `meetingJob.mjs` → `assetArchive.mjs`, with the error message lost at the `activities.run` boundary.
