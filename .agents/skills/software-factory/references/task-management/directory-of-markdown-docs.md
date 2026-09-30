# Markdown task-directory adapter

Use this as the default only when the project has no existing task system or the user chooses it. The directory must remain useful without a Kanban UI.

## Layout

```text
BACKLOG.md                 # root quick-capture checkboxes; not official tasks
TASKS/
  KANBAN/                  # official task cards and board state
  WIP/                     # active task planning and progress artifacts
  COMPLETE/                # completed task artifacts/outcomes
```

Use project-specific IDs and filenames for official cards. When planning begins, the orchestrator creates `TASKS/WIP/<task>/`, named after the task (filesystem-safe spelling if necessary), and copies the templates into `brainstorm.md` and `todos.md`. Record the exact path on the official card. Both populated documents are mandatory before implementation; see [orchestrator](../orchestrator.md) for the iterative Q&A and handoff procedure. Keep the original official card in `TASKS/KANBAN/` after completion and link its outcome under `TASKS/COMPLETE/`.

## Task cards

A card should identify the task, describe the desired outcome and acceptance criteria, and expose status. Optional frontmatter can include type, board order/priority, created/touched timestamps, source issue, tags, status history, parent/child links, and prerequisites. Use only fields that are useful and maintainable; keep schemas documented. Bulleted checkboxes are suitable for actionable steps. Put instructions in templates reminding workers to maintain checklists and status.

The exact initial Markdown schema is project-specific; settle it when setting up the task system rather than assuming all projects need the same YAML fields. Ensure a visible `blocked` state and a place for comments or rationale (card body, linked notes, or activity log).

## Shared state and worktrees

Implementation branches/worktrees isolate code, not operational state. Task status, blockers, comments, WIP planning/progress artifacts, and worker registry updates must be written where the orchestrator can see them from the main checkout; do not leave the only copy inside a worker worktree. Avoid concurrent edits to the same task or shared planning files.

The official task card is the board-level record. WIP `todos.md` is the detailed ordered checklist, and `outcome.md` records completion, evidence, and important decisions. Move completed artifacts from WIP to COMPLETE and update the original card with a link.
