# Worker

A worker is a separate agent session assigned a bounded implementation task by the orchestrator. The worker receives an agreed task, not an open-ended mandate to negotiate product scope with the user.

## Before implementation

- Always work from the task worktree provisioned by the orchestrator at `<repo>/.worktrees/<task-name>`, on branch `<task-name>`. This applies to every task, including documentation-only work and single-worker runs. Verify the assigned directory and branch before task work. If launched elsewhere, stop and notify the orchestrator; never create your own worktree or fall back to the main checkout.
- Before implementation, verify the orchestrator supplied the official task path/URL and populated `TASKS/WIP/<task>/brainstorm.md` and `todos.md`. If either is missing or important requirements remain unresolved, stop and notify the orchestrator; do not scaffold or brainstorm a replacement yourself.
- Read project `AGENTS.md`, relevant `PRODUCT/` and `ARCHITECTURE/` documents, the official task, all documents in its WIP directory, and applicable how-we-build guidance. Follow the agreed `todos.md` plan.
- Confirm the task is a coherent, appropriately sized unit. If it is too broad, explain why and ask the orchestrator to split it into official tasks before doing partial work.
- Run task edits, tests, and builds from the assigned worktree. Explicit shared bookkeeping and final integration may target the main checkout; neither authorizes performing the task there. Keep shared status and artifacts visible as required by the task adapter.
- Fill in smaller implementation details as needed. Do not transfer unresolved product or architecture planning to the worker. If a necessary human decision remains, mark the task blocked in the shared task system and notify the orchestrator when possible; do not hold a private question in the worktree.

## Implement and validate

- Follow agreed scope and project invariants. If the proposal directly conflicts with established product/architecture guidance, stop and record the conflict as a blocker; missing documentation alone is not a blocker when reasonable work can be inferred consistently.
- Prefer TDD and a thin, end-to-end tracer-bullet slice where appropriate.
- Run agreed tests and independently exercise the actual product using the project's QA affordances. Implementation tests alone do not establish product QA.
- Maintain `TASKS/WIP/<task>/todos.md`, progress, and visible notes as work proceeds. Put blockers and task status in the main/shared task system, not only in the implementation worktree, so the orchestrator can observe them.
- When tests, QA, or integration fail, keep iterating while making progress. The worker decides whether it is stuck; when it runs out of useful options, mark the task blocked, explain evidence and attempted remedies, and notify the orchestrator.

## Complete

Follow [integration](integration.md): sync current `main`, resolve ordinary conflicts, validate, merge the task branch locally when ready, update visible task/artifact state, and clean up. Keep remote push and publication separate; these are not authorized by local integration.
