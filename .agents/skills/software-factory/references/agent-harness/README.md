# Agent-harness adapter contract

The factory core requires a way for the orchestrator to delegate bounded tasks, track their lifecycle, and retrieve visible progress and results. Harnesses differ substantially; document tested behavior in an adapter and ask the user to resolve gaps before relying on it.

## Worker operations to map

Describe how the adapter supports (or explicitly does not support):

- Start one worker with task brief, context, tools/permissions, and workspace.
- Start multiple independent workers with a declared concurrency limit; join all or selected results.
- Report status/progress, retrieve results/artifacts, and route a worker question/blocker to the orchestrator.
- Message/steer, cancel, inspect, and resume workers when available.
- Reconcile jobs after orchestrator/session restart and recover missed notifications.

These dimensions are independent: foreground/blocking vs background, returned result vs notification/poll, one-shot vs steerable, sequential vs parallel, fresh vs forked context, and shared vs isolated workspace. Do not call a worker fire-and-forget for real factory work unless it remains registered, observable, and recoverable.

## Factory policy

- Parent/orchestrator retains user conversation, planning, arbitration, and dispatch authority. Workers do not autonomously spawn more agents unless explicitly allowed during setup.
- Default concurrency is three work items; ask for the user's limit. Ask whether nested subworkers are permitted; if yes, agree depth/concurrency bounds. Workers escalate oversized work to the orchestrator rather than recursively decomposing without limit.
- Keep worker identity, task, session/process ID, workspace, status/liveness, and last update in shared factory metadata when the harness doesn't expose a reliable shared view. The registry is independent of the task system.
- Workers should update task state in the shared task system/main checkout, never solely inside the isolated worktree. Worker questions needing the user are treated as planning gaps: mark task blocked and notify the orchestrator if possible.
- Test unfamiliar launch, progress, question, completion, failure, cancellation, and restart behavior with harmless dummy jobs before selecting an adapter.

## Harness notes

- [Pi](pi.md)
- [Claude Code](claude.md) — placeholder
- [OpenCode](opencode.md) — placeholder
