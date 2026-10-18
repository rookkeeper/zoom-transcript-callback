# Task execution: Consistent application logging with actionable processor errors

Official task: `TASKS/KANBAN/app-logging.md`
Planning directory: `TASKS/PLANNING/app-logging/`
Worker/session: <assigned identity>
Worktree: `<repo>/.worktrees/app-logging` (provisioned by orchestrator)
Branch: `app-logging`
Base commit: <committed main SHA>

Existing draft retained; implementation is not dispatched. Finalize this ordered checkbox plan only after explicit brainstorming completion, including QA and overlap decisions. At dispatch, move the directory to `TASKS/WIP/YYYY-MM-DD-app-logging/` using the actual dispatch date and update this header, brainstorm, and card before provisioning. Worker: maintain the checklist and escalate unresolved requirements.

## Checklist

- [ ] Review task plan, project instructions, PRODUCT/, and ARCHITECTURE/.
- [ ] Finalize TASKS/PLANNING/app-logging/brainstorm.md and todos.md after explicit brainstorming completion (orchestrator). — Round 1 answers recorded; overlap and QA planning remain deferred.
- [ ] At dispatch, move planning artifacts to dispatch-dated WIP, update all path mentions, and commit before provisioning (orchestrator).
- [ ] Review all documents at the supplied dated WIP path (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Confirm the task is appropriately sized; return to orchestrator if it needs decomposition.
- [ ] Single conventional application log (destination, format, filter keys) + convention doc.
- [ ] Structured error capture (message + stack + request/meeting IDs) on all operational failure paths; actionable row errors.
- [ ] Fail-fast for pre-spawn failures (no auto-retry); tests for retry/non-retry paths.
- [ ] `npm test` passes; failure-path coverage added.
- [ ] QA deferred (task not starting immediately; plan QA at kickoff).
- [ ] Sync current main, resolve conflicts, and repeat relevant validation.
- [ ] If requested, prepare the isolated user walkthrough and obtain approval before integration.
- [ ] Merge locally when ready; update shared task state/artifacts.
- [ ] Record outcome and verification evidence; move artifacts and the Markdown card into TASKS/COMPLETE/YYYY-MM-DD-app-logging/ using the dispatch date, update links, and clean up worktree.

## Progress and decisions

- 2026-10-01: triggering failure diagnosed (meeting `87850645500`, `No completed transcript` thrown pre-spawn, swallowed by generic error paths). Task card + brainstorm written on main working tree (uncommitted). Awaiting user's Round 1 answers before finalizing the execution slice.

## Blockers

- Before dispatch: resolve deferred `success-ledger-all-exits` overlap, confirm `simplify-architecture` prerequisite, and plan independent product verification. Round 1 answers are recorded in `TASKS/PLANNING/app-logging/brainstorm.md`; this maintenance does not settle the remaining decisions.
