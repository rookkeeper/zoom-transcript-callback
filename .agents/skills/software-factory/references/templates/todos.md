# Task execution: <task title>

Official task: <path or URL>
Planning directory: `TASKS/WIP/<task>/`
Worker/session: <assigned identity>
Worktree: `<repo>/.worktrees/<task-name>` (provisioned by orchestrator)
Branch: `<task-name>`
Base commit: <committed main SHA>

Orchestrator: copy this template to `TASKS/WIP/<task>/todos.md` when planning begins. Fill in a descriptive, ordered checkbox plan after brainstorming, including nested steps where useful. Replace placeholder paths. Worker: maintain the checklist and progress; escalate unresolved requirements instead of inventing them.

## Checklist

- [ ] Review task plan, project instructions, PRODUCT/, and ARCHITECTURE/.
- [ ] Create TASKS/WIP/<task>/brainstorm.md and TASKS/WIP/<task>/todos.md, perform brainstorming and todo list generation, and update the paths here (orchestrator).
- [ ] Review all TASKS/WIP/<task> documents (worker).
- [ ] Before worker launch: verify clean, committed main; create the matching task branch/worktree; verify planning documents in it; launch worker there (orchestrator).
- [ ] Verify assigned worktree and branch before task edits; stop if launched elsewhere, never create a worktree or work from main (worker).
- [ ] Confirm the task is appropriately sized; return to orchestrator if it needs decomposition.
- [ ] <Task-specific vertical slice and its acceptance criteria; add nested checkboxes as needed.>
- [ ] <Relevant tests and checks.>
- [ ] <Independent product QA steps and expected observable results.>
- [ ] Sync current main, resolve conflicts, and repeat relevant validation.
- [ ] Merge locally when ready; update shared task state/artifacts.
- [ ] Record outcome and evidence; clean up worktree.

## Progress and decisions

- <Progress, evidence, and links to new brainstorm decisions.>

## Blockers

- <Reason, attempts, and decision/prerequisite needed; also update shared task state.>
