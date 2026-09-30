# Building a reusable software factory

We are designing a repo-agnostic, agent-harness-agnostic software factory: an agent skill plus supporting scripts that helps set up projects, plan tasks, coordinate workers, validate results, and integrate completed work with minimal routine human interruption.

The factory should adapt to the project's task-management system and the user's preferred way of working. Human and orchestrator should share a clear view of tasks, ownership, and progress. Strong defaults include TDD, tracer-bullet implementation, independent QA, isolated task branches, and easy-to-undo integration.

## Documents and reading order

1. [rough_outline_of_factory.md](rough_outline_of_factory.md) — the first document: initial concepts, proposed workflow, open questions, and plans for recording/sharing the work. It is a starting point, not a finalized specification.
2. [brainstorming.md](brainstorming.md) — our subsequent back-and-forth: refinements, preferences, possible approaches, and unresolved questions. Keep adding to it as we discuss the factory; it identifies where our thinking has moved beyond the rough outline.
3. [Deprecated development lifecycle](../.agents/skills/old-development-lifecycle-do-not-use/SKILL.md) — historical context for how Rook development used to work. It contains useful ideas to retain or adapt, such as visible planning records, isolated worktrees, validation, documentation maintenance, and cleanup. It also contains practices we want to move away from, especially repeated approval gates for routine merging. Read it as source material, not as instructions for the new factory.
4. [TODO.md](TODO.md) — terse build plan for the factory itself. Each major document gets a checkbox and a short outline of its contents; nested checkboxes capture important sections and supporting files.
5. [agent-subagent-interaction-models.md](agent-subagent-interaction-models.md) — research on sync/async worker interaction patterns and current Claude Code, Codex, Pi, and OpenCode behavior; informs the harness adapter and agent test.

## Documents we are creating

The factory will be a generic skill with a small core and focused references:

- **Core workflow:** `SKILL.md`, setup, orchestrator, worker, integration, and periodic-audit guidance.
- **Task management:** a generic task-system contract plus adapters for Markdown task cards and future systems such as GitHub or Jira. Setup creates root-level `BACKLOG.md` for quick capture; official tasks live under `TASKS/` and their working artifacts are richer.
- **Agent harnesses:** a generic worker contract plus adapters for Pi, Claude, and other harnesses. These explain how to launch workers, exchange context, track liveness, and recover interrupted work.
- **How we build:** customizable TDD and tracer-bullet defaults, independent QA guidance, and domain-specific guidance for servers, services, frontends, and native applications.
- **Templates:** starter PRODUCT, ARCHITECTURE, AGENTS, task, brainstorm, and outcome documents.
- **Scripts:** factory-internal scripts handle worker management, worktrees, integration, task operations, and tests. Separately, the project may use a root-level `scripts/` directory as a language-agnostic, makefile-like index of common commands; that convention is optional and belongs in the editable build guidance.

The skill has now been created in `.agents/skills/software-factory/`. Its references, adapters/placeholders, QA/build guidance, and starter templates are in place. Worker launch/registry automation and end-to-end workflow validation remain intentionally unimplemented pending harness/task-system choices and the user's planned workflow review.

## Current scope

Review the skill and its `TODO.md` checklist. The end-to-end check is explicitly paused: tell the user when the documentation is ready, then wait for their stronger-model workflow review before running it.
