# Integration and completion

The worker owns routine integration for its task. There is no routine user approval gate or central integration slot. Each task should remain identifiable and reasonably easy to undo.

1. Finish the agreed implementation, tests, and independent QA.
2. Sync the task branch with current `main`; resolve ordinary conflicts in the task branch.
3. Run the relevant validation again after conflict resolution. If a check fails, fix and retry while making progress. If blocked, record why in the shared task system and notify the orchestrator.
4. Merge the completed task branch into local `main` when ready. Do not push remotely, publish, deploy, or release unless separately authorized.
5. Write/update the outcome artifact in the main checkout. Update the official task status and link its completed artifacts. For Markdown tasks, move WIP artifacts to `TASKS/COMPLETE/` and keep the original card in `TASKS/KANBAN/` with a link to the outcome.
6. Commit bookkeeping/artifact changes when appropriate and clean up the task worktree/branch according to project policy.

If integrating changes requires a product, architecture, or scope decision, stop and mark the task blocked rather than guessing. Keep the task branch/change identifiable so the user can revert or repair it later; reversibility is best-effort, not a guarantee.
