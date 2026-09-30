# Brainstorm: Log every Pi exit to the completion ledger

Official task: `TASKS/KANBAN/success-ledger-all-exits.md`
Planning directory: `TASKS/WIP/success-ledger-all-exits/`
Execution plan: [todos.md](./todos.md)
Status: implemented, awaiting integration

Migrated from `CHANGES/2026-09-29-success-ledger-all-exits` when this project adopted the software-factory skill. The original directory carried a decision record rather than a Q&A transcript; it is preserved below verbatim.

## Initial user details

The user's direction: log failures to the success ledger "too or any other type of exit". Accepted as explicit and small, so the planning Q&A round was bypassed rather than run — a documented departure, not an omission.

## Round 1 — Decision record (bypassed Q&A)

1. **Question:** Should the ledger record only successes?
   **Answer:** No. Make it a completion ledger: one row per finished Pi job, whatever the outcome. Keep the existing `transcript_processed` event name and shape for the success path so existing readers keep working.

2. **Question:** What should non-success exits emit?
   **Answer:** A distinct event (chosen: `transcript_failed`) with the same job context (`requestId`, `meetingUuid`, `meetingId`), the Pi `pid` when available, the `status` (`failed`/`incomplete`), the `error`, and whatever metadata exists.

3. **Question:** What about failures that happen before Pi spawns (asset download failure, missing Obsidian CLI, spawn errors)?
   **Answer:** Log those too, with no `pid`, since they are also terminal exits for the meeting.

4. **Question:** Does this change the database schema or retry behavior?
   **Answer:** No. Non-goals: no SQLite schema change, no retry-behavior change, no rename of the ledger file or its env var.

## Agreement and readiness

Scope, acceptance criteria, and tests were agreed and the work was implemented and validated. Remaining work is integration only: sync with `main`, open and validate the PR, merge, record the outcome, and clean up the worktree. No product or architecture questions remain open.
