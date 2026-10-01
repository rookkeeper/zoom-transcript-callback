---
id: "meeting-uuid-key"
title: "Key recording lookup by meeting UUID, not numeric meeting ID"
status: triage
created: "2026-10-01"
touched: "2026-10-01"
tags: [zoom, recordings, correctness]
---

# Key recording lookup by meeting UUID, not numeric meeting ID

## Desired outcome

A `recording.transcript_completed` callback for one instance of a reused meeting ID (e.g. PMI `87850645500` "Ride Along – John builds") is processed against that instance's own assets — never against a sibling instance's asset list. Recording fetch, local folders, retry lookup, and activity metadata all distinguish instances by meeting UUID.

## Acceptance criteria

- [ ] Recording API fetch uses the meeting UUID (double-URL-encoded) from the webhook payload, not the numeric meeting ID.
- [ ] Numeric meeting ID retained in metadata for display/linking.
- [ ] Local meeting folders disambiguate instances sharing a numeric ID (or topic/date).
- [ ] `manual-retry.mjs` / `process-meeting.mjs` accept a UUID (or otherwise select the right instance).
- [ ] `npm test` passes; UUID-keyed paths covered by tests.
- [ ] Product QA: live re-fire or API-level check showing the 09:53 instance (`1in20/L2QcWjtTp5hFfzcQ==`, 12 files incl. transcript) resolves to its own assets, distinct from the 12:48 stub (`3zvnh0h9QCGfx/kuigKUoQ==`, 3 files, no transcript).

## Planning artifacts

Planning directory: `TASKS/WIP/meeting-uuid-key/`

## Planning and implementation checklist

- [ ] Review relevant PRODUCT/ and ARCHITECTURE/ guidance.
- [ ] Orchestrator: create brainstorm.md and todos.md from templates, gather user details, and iterate inline Q&A until both parties agree the requirements and QA plan.
- [ ] Orchestrator: populate the execution checklist and verify both WIP files before dispatch.
- [ ] Worker: review all TASKS/WIP/meeting-uuid-key documents (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Run agreed tests and independent product QA.
- [ ] Record outcome and evidence; update this card and link completed artifacts.

## Notes / activity

- 2026-10-01: filed from live diagnosis. Meeting `87850645500` has two instances: 09:53 CT 2h37m full recording (UUID `1in20/...`, transcript completed) and 12:48 CT 12s stub (UUID `3zvn...`, "Unable to transcribe"). The `meetingId`-keyed `GET /v2/meetings/{id}/recordings` returned the stub's asset list for the real recording's callback, producing the `No completed transcript` failure. Both UUIDs verified to resolve distinctly via double-encoded `/v2/meetings/{uuid}/recordings`.
- Interacts with pending `simplify-architecture` (exhibit A for it): touches `meetingJob`, `assetArchive`, `zoomDownloads`, `retry`, manual scripts, folder naming.
