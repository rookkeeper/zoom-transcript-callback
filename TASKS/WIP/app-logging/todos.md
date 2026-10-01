# Task execution: Consistent application logging with actionable processor errors

Official task: `TASKS/KANBAN/app-logging.md`
Planning directory: `TASKS/WIP/app-logging/`
Worker/session: <assigned identity>
Worktree: `<repo>/.worktrees/app-logging` (provisioned by orchestrator)
Branch: `app-logging`
Base commit: <committed main SHA>

Orchestrator: copy this template to `TASKS/WIP/<task>/todos.md` when planning begins. Fill in a descriptive, ordered checkbox plan after brainstorming, including nested steps where useful. Replace placeholder paths. Worker: maintain the checklist and progress; escalate unresolved requirements instead of inventing them.

## Checklist

- [ ] Review task plan, project instructions, PRODUCT/, and ARCHITECTURE/.
- [ ] Create TASKS/WIP/app-logging/brainstorm.md and TASKS/WIP/app-logging/todos.md, perform brainstorming and todo list generation, and update the paths here (orchestrator). — done (brainstorm); todos pending Round 1 answers.
- [ ] Review all TASKS/WIP/app-logging documents (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Confirm the task is appropriately sized; return to orchestrator if it needs decomposition.
- [ ] Single conventional application log (destination, format, filter keys) + convention doc.
- [ ] Structured error capture (message + stack + request/meeting IDs) on all operational failure paths; actionable row errors.
- [ ] Fail-fast for pre-spawn failures (no auto-retry); tests for retry/non-retry paths.
- [ ] `npm test` passes; failure-path coverage added.
- [ ] QA deferred (task not starting immediately; plan QA at kickoff).
- [ ] Sync current main, resolve conflicts, and repeat relevant validation.
- [ ] Merge locally when ready; update shared task state/artifacts.
- [ ] Record outcome and evidence; clean up worktree.

## Progress and decisions

- 2026-10-01: triggering failure diagnosed (meeting `87850645500`, `No completed transcript` thrown pre-spawn, swallowed by generic error paths). Task card + brainstorm written on main working tree (uncommitted). Awaiting user's Round 1 answers before finalizing the execution slice.

## Blockers

- None yet — pending user answers in `TASKS/WIP/app-logging/brainstorm.md` Round 1.
