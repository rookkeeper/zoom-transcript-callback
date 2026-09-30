# Task-management contract

The factory core is independent of any task application. During setup, identify the user's system and map its capabilities; do not silently assume Markdown, GitHub, or Jira. An adapter should tell the orchestrator how to list/read/create/update tasks and record descriptions, status, and visible comments/activity. Prefer support for priorities, subtasks, dependency links, and a blocked state, but treat these as optional capabilities. If the system is missing or underspecified, tell the user and define the adapter before relying on it.

## Shared concepts

- **Quick capture:** root `BACKLOG.md` is a lightweight list of `- [ ]` items, not the official task board. It is acceptable to capture an idea without creating a fully specified issue. When promoting an item to the official system, check its backlog box and link/reference the official task.
- **Official tasks:** live in the selected task system. The orchestrator reviews both the official system and quick-capture backlog when choosing work.
- **Ready:** no known blocker/dependency; user and orchestrator agree requirements are explicit enough for isolated implementation. The official task links to `TASKS/WIP/<task>/`, containing populated `brainstorm.md` and `todos.md`. These local planning artifacts are required even when the official task lives in GitHub, Jira, or another system. Promotion from backlog alone does not establish readiness.
- **Blocked:** the task cannot proceed without an external decision or missing prerequisite. Record the reason and requested decision visibly; a task status alone is insufficient when a comment/description can explain it.
- **In progress:** assigned to an active worker/session. Ownership and liveness may be tracked outside the task system, but must be visible to the orchestrator and human.
- **Complete:** implementation and agreed validation are complete and the task links to its outcome/artifacts.

Task assignment/worker liveness is factory metadata separate from task-system fields, even if the task system also supports assignment. Do not make a task's status depend on state hidden in an agent transcript.

## Missing capabilities

When a system lacks explicit priority, dependencies, subtasks, or comments, the orchestrator makes cautious best-effort inferences from task text and activity. There are usually few active tasks, so simple judgment is acceptable. State the limitation to the user, make important inferred relationships/blockers visible where possible, and invite correction. Do not pretend inferred metadata is native or authoritative.

If there is no existing task system, use the [Markdown task-directory adapter](directory-of-markdown-docs.md). For GitHub and Jira, these files are discussion placeholders, not complete adapters: [GitHub](github.md), [Jira](jira.md).
