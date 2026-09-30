# Skill-internal scripts

This directory is reserved for scripts that implement the factory itself (for example, worker registry, worktree, integration, task, or test helpers). No generic automation is implemented here yet.

Do not invent scripts before the project has selected its task system and harness and the workflow has been validated. Script behavior must be documented, tested, and safe around user data and existing worktrees. Keep these distinct from an optional project-root `scripts/` directory, which can provide convenient commands for building and operating the application.

Worker launch/registry and worktree/integration automation remain deferred until harness/task-system choices are made. Test candidate worker mechanisms with harmless dummy workflows before selecting one.
