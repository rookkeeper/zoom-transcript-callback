# Task execution: Key recording lookup by meeting UUID, not numeric meeting ID

Official task: `TASKS/KANBAN/meeting-uuid-key.md`
Planning directory: `TASKS/WIP/meeting-uuid-key/`
Worker/session: <assigned identity>
Worktree: `<repo>/.worktrees/meeting-uuid-key` (provisioned by orchestrator)
Branch: `meeting-uuid-key`
Base commit: <committed main SHA>

Orchestrator: copy this template to `TASKS/WIP/<task>/todos.md` when planning begins. Fill in a descriptive, ordered checkbox plan after brainstorming, including nested steps where useful. Replace placeholder paths. Worker: maintain the checklist and progress; escalate unresolved requirements instead of inventing them.

## Checklist

- [x] Review task plan, project instructions, PRODUCT/, and ARCHITECTURE/.
- [x] Create TASKS/WIP/meeting-uuid-key/brainstorm.md and TASKS/WIP/meeting-uuid-key/todos.md, perform brainstorming and todo list generation, and update the paths here (orchestrator). — Round 1 decided 2026-10-01; execution slice written.
- [ ] Review all TASKS/WIP/meeting-uuid-key documents (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Confirm the task is appropriately sized; return to orchestrator if it needs decomposition.
- [ ] UUID plumbing: `processMeeting`/`listAssets`/`downloadMeetingAssets`/`deleteMeeting` take meeting UUID; API paths use double-encoded UUID (`encodeURIComponent(encodeURIComponent(uuid))`); numeric ID kept in metadata only. `retry.mjs` passes `details.meetingUuid`; `callback.mjs` metadata unchanged (already stores both).
- [ ] Folder disambiguation: `listAssets` appends ` 2`, ` 3`, … when `<date> <topic>` already exists (belonging to a different UUID); existing single-instance folders unchanged.
- [ ] Scripts migrated: `manual-retry.mjs` (takes UUID, matches `meetingUuid`, calls the same `createMeetingJob` processor), `process-meeting.mjs` (takes UUID), `zoom-download.mjs --meeting` (accepts UUID).
- [ ] Tests: UUID-keyed fetch paths, double-encoding, folder incrementing, retry lookup by UUID. `npm test` passes.
- [ ] Product QA (approved live run): process UUID `1in20/L2QcWjtTp5hFfzcQ==` end-to-end — expect its own 12-file asset list, Peeps event note, downloads, cloud delete-by-UUID of that instance only; stub instance `3zvn...` untouched in cloud.
- [ ] Sync current main, resolve conflicts, and repeat relevant validation.
- [ ] Merge locally when ready; update shared task state/artifacts.
- [ ] Record outcome and evidence; clean up worktree.

## Progress and decisions

- 2026-10-01: task filed; live API verification done (both UUIDs resolve distinctly); Round 1 questions appended to brainstorm. Awaiting user answers.

## Blockers

- None yet — pending user answers in `TASKS/WIP/meeting-uuid-key/brainstorm.md` Round 1.
