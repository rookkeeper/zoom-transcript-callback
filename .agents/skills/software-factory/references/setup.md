# Project setup

Use this when introducing the factory to a new or existing project. Explain the purpose of the project documents and let the user shape the setup; do not turn setup into a burdensome questionnaire.

## 1. Understand the project

- Inspect the repository, existing instructions, documentation, task system, scripts, tests, and QA affordances.
- Ask what is being built, who it serves, its important product invariants, and which technologies or constraints are already decided.
- Discuss run/test/QA commands, logging, architecture, and the user's preferred engineering practices. TDD and tracer-bullet delivery are defaults to discuss, not unchangeable mandates.
- Ask which harness and task-management system are in use and how workers should be started, supervised, and limited. Default concurrency is three; ask whether workers may spawn subworkers and under what limits.
- Load the relevant adapter references. If guidance is missing or insufficient, say so and work with the user to specify it before relying on that integration.

## 2. Reconcile project guidance

Ensure the project has:

- `PRODUCT/` for goals, behavior, and invariants.
- `ARCHITECTURE/` for concise, component-oriented architecture documentation.
- A root `AGENTS.md` with project-specific rules, commands, code structure, logging, and required QA affordances.
- A root `BACKLOG.md` for lightweight quick capture, separate from the official task system.

Use the templates in `references/templates/`. Preserve and reconcile useful existing documents; don't keep documents merely because they already exist. `PRODUCT/README.md` and `ARCHITECTURE/README.md` are terse indexes with links to the substantive docs, not places to duplicate them. Write product goals from user-approved understanding. For architecture, identify the actual major components from their purposes and responsibilities, then document them as described below; distinguish observed implementation from intended design and leave unresolved decisions open.

### Architecture documentation

- Use one Markdown file per major component/module. Name files for **nouns** (the component), not verbs (workflows or operations).
- For larger systems, use subdirectories for major components and split their subcomponents within those directories. Keep each document focused on one cohesive purpose; split long or unrelated material.
- Terse fragments and bullets are preferred when clear. Explain each component's purpose, main code locations, and responsibility boundaries.
- At the top of each component doc, identify its prominent technology stack and why those choices matter. Keep this high-level; do not repeat dependency manifests or package lists.
- Document only APIs important to understanding the component. Describe high-level inputs and outputs; omit helpers, minor parameters, and implementation trivia.
- When a component owns important data, describe the key schema: entities, important fields, relationships, and storage boundary. Focus on the shape needed to understand behavior; omit exhaustive field inventories and avoid duplicating an authoritative schema elsewhere.
- Call out important class/object hierarchies and extension points, especially base classes/interfaces and whether new components are expected to subclass or implement them. Mention composition when it is a key boundary; omit incidental inheritance.
- Include important processes only when they clarify component behavior. A Mermaid diagram is optional when it communicates relationships more clearly than prose.
- Avoid duplication across component docs and README indexes. Prefer links to the owning component doc over restating details.
- Use `references/templates/architecture-component.md` as a starting point; omit sections that do not apply. Review the result for clarity, brevity, and lack of redundancy.

A root-level `scripts/` directory may be useful as a language-agnostic index of common project commands, but it is optional. Keep project scripts distinct from this skill's own support scripts.

## 3. Select the task system

Discuss the user's existing system (for example, GitHub Issues, Jira, or Markdown files). Use its adapter if available; otherwise, stop and define the integration with the user. The generic contract and fallbacks are in [task management](task-management/README.md).

If no task system exists, use the Markdown layout described there: official task cards under `TASKS/KANBAN/`, working artifacts under `TASKS/WIP/`, and completed artifacts under `TASKS/COMPLETE/`. The root `BACKLOG.md` remains quick capture, not an alternative official task board. Regardless of task system, the orchestrator creates `TASKS/WIP/<task>/brainstorm.md` and `todos.md` when fleshing out each task, links the directory from the official task, and completes the [planning Q&A procedure](orchestrator.md) before dispatch.

## 4. Select the worker mechanism

Discuss how the current harness starts workers, exchanges context/questions/results, reports progress, and recovers interrupted work. Agree on concurrency and subworker permissions. Do not silently assume an adapter works: test uncertain behavior with harmless dummy jobs first. See [agent harnesses](agent-harness/README.md).

### Worktree setup

- Create `<repo>/.worktrees/` during project setup and add `/.worktrees/` to the repository's `.gitignore`. Commit the ignore rule with the approved setup changes; the empty directory itself is not tracked.
- Each task uses `.worktrees/<task-name>` and branch `<task-name>`. Choose one filesystem- and Git-ref-safe task name and use it consistently; record its mapping to the official task and WIP directory.
- The orchestrator creates the task branch/worktree from clean, committed `main` before starting the worker, then launches the worker with that worktree as its working directory. Workers never provision their own worktrees.
- Validate that the selected harness can launch into an already-created worktree. Do not enable a second allocator that relocates it or creates another worktree. If the harness cannot support this layout, block and resolve the integration rather than silently changing the location.
- Document these rules in project guidance. See [orchestrator](orchestrator.md) for the clean-base and dispatch checks.

## 5. Agree on build and QA practices

Discuss testing approach, TDD, tracer-bullet implementation, logging, and how QA will operate the actual product independently. Define project-specific commands and UI automation affordances in `AGENTS.md`. If real product QA is not currently possible, identify the gap rather than claiming tests prove the product works.

## 6. Walk through the workflow

Explain `PRODUCT/`, `ARCHITECTURE/`, task cards, `BACKLOG.md`, WIP artifacts, and worker roles in context. Answer questions and gently correct process misunderstandings when useful; avoid repeating process explanations unnecessarily.
