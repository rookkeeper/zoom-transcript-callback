# Pi harness adapter — candidate, validate before use

Pi might not have a core subagent orchestrator (if it does, then the remainder of this file can be ignored). Candidate mechanisms include an extension that launches child Pi processes, such as the official subagent extension example, or separately managed sessions (for example, tmux). These are options, not a selected factory implementation.

Before choosing, verify the exact current Pi version and the user-approved setup. Run dummy jobs to test: launch and concurrency limits; progress visibility; delivery of final result, failure, and worker questions; cancellation; interruption/restart recovery; and correct workspace/task-state visibility. Confirm child process permissions, agent definitions, and project trust behavior. Do not claim background/resume/steer support unless tested.

## Factory worktree contract

The orchestrator must provision `<repo>/.worktrees/<task-name>` on matching branch `<task-name>` and launch the worker with that exact working directory. The worker never allocates a worktree. See [orchestrator](../orchestrator.md) for clean-main and planning-document gates.

For pi-subagents, follow the installed skill and validate launching in an existing worktree with automatic allocation disabled. Its managed allocator may reject in-repository worktrees; do not assume `worktree: true` implements this factory layout. Resolve adapter incompatibilities before dispatch rather than relocating workers or starting them in the main checkout.

Useful reference: <https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent>
