# Task execution: Log every Pi exit to the completion ledger

Official task: `TASKS/KANBAN/success-ledger-all-exits.md`
Planning directory: `TASKS/WIP/success-ledger-all-exits/`
Worker: single agent session
Worktree: `/Users/johnberryman/projects/github/rookkeeper/_worktrees/success-ledger-all-exits` (outside the factory default; relocation pending)
Branch: `success-ledger-all-exits`
Base commit: `ab7b157`

Code work is complete and validated. What remains is integration. The sections below preserve the original change record verbatim.

# Log every Pi exit to the success ledger

## Context

The success ledger (`logs/zoom-transcript-success.jsonl`, via `ZOOM_SUCCESS_LOG_PATH`) currently receives a `transcript_processed` row only when Pi exits 0 **and** writes a `completed` marker. Failed, timed-out, stalled, and incomplete jobs leave no trace there, so the ledger cannot answer "what happened to every meeting?" — the user must join the execution log against the sqlite activity table instead.

## Decision details

- The success ledger becomes a **completion ledger**: one row per finished Pi job, whatever the outcome.
- Keep the existing `transcript_processed` event name and shape for the success path (backwards compatible for any readers).
- Non-success exits get a distinct event (e.g. `transcript_failed`) carrying the same job context (`requestId`, `meetingUuid`, `meetingId`), the Pi `pid` when available, the `status` (`failed`/`incomplete`), the `error` string, and whatever metadata exists (asset info, notePaths/summary when present).
- Pre-spawn failures (asset download failure, `OBSIDIAN_CLI_MISSING`, spawn errors) already return before the child exists; decision: log those too, with no `pid`, since they are also terminal exits for the meeting. (Agreed implicitly by "any other type of exit"; confirm during review if this overreaches.)
- Non-goals: no schema change to sqlite; no change to retry behavior; no rename of the file or env var in this change.

## Work checklist

- [x] Emit a ledger row for every terminal Pi outcome (success, failed, incomplete, pre-spawn failure).
- [x] Update `test/processor.test.mjs` to assert a ledger row exists for every outcome with the right event/status.
- [x] Update README + skill reference wording (success ledger → completion ledger semantics).
- [x] Run `npm test` and complete the final review.

## Original lifecycle checklist

# Development lifecycle worksteps

> As you work through the development lifecycle, make sure that you check the boxes in the following list as you finish with each item. If you've chosen to go an unusual path like skipping, and I don't hear then make an explicit note to the side of each bullet explaining the departure and the rationale.

- [x] Orient to the project
- [x] Create the change directory and lifecycle record
- [x] Brainstorm to work, or bypass because the work is simple or obvious; do not mark complete until the developer confirms the direction — bypassed: developer's direction ("log failures there too or any other type of exit") is explicit and small
- [x] Record the agreed decision and TODO after the explicit decision gate
- [x] Prepare the implementation workspace after the planning commit
- [x] Implement and test
- [x] Mark compatibility surfaces — none: success-row shape preserved (additive `status` field only); new `transcript_failed` event is additive; no shims or fallbacks
- [x] Maintain product and architecture documentation
- [x] Run final validation
- [ ] Synchronize with main before submitting
- [ ] Open and validate the PR
- [ ] Merge with approval
- [ ] Record outcomes and clean up
