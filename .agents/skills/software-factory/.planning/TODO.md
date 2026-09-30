# Factory skill — document plan

## Core workflow — written

- [x] `.agents/skills/software-factory/SKILL.md` — generic entry point; setup/ongoing workflow, progressive reference map, operating principles.
- [x] `references/setup.md` — explain docs; establish PRODUCT/, ARCHITECTURE/, AGENTS.md, root BACKLOG.md, ignored .worktrees/; choose task system/harness; discuss TDD/QA/logging/scripts and worker policy.
- [x] `references/orchestrator.md` — inspect/select/promote/split tasks; settle high-level product UX/UI, architecture, tracer design with user; dispatch, observe, recover; explain process as useful.
- [x] `references/worker.md` — implement agreed task; high-level decisions excluded; test and independent QA; block on spec conflict or impossible QA; keep artifacts visible.
- [x] `references/integration.md` — worker syncs main, resolves conflicts, validates, merges directly; no integration slot or routine approval; update outcomes and clean up.
- [x] `references/audits.md` — periodic product/architecture/code alignment, compatibility and cleanup review.

## Task system — written

- [x] `references/task-management/README.md` — minimum capabilities; optional relationships; BACKLOG vs official tasks; separate worker registry; missing adapter behavior.
- [x] `references/task-management/directory-of-markdown-docs.md` — TASKS/KANBAN, visible main-checkout WIP/COMPLETE artifacts, promotion, card schema guidance.
- [x] `references/task-management/github.md`, `jira.md` — explicit user-discussion placeholders.
- [x] `references/templates/task-management-skill.md` — repo-specific adapter starter.

## Harness — guidance written; experiment remains

- [x] `agent-subagent-interaction-models.md` — interaction taxonomy and current Claude Code, Codex, Pi, OpenCode comparison; portable adapter contract proposal.
- [x] `references/agent-harness/README.md` — pluggable worker contract, shared registry proposal, recovery, concurrency/nesting.
- [x] `references/agent-harness/pi.md` — current Pi options, official subagent example, tmux alternative, setup questions.
- [x] `references/agent-harness/claude.md`, `opencode.md` — explicit user-discussion placeholders; detect and fill gaps.
- [ ] Run Pi dummy-worker experiments: progress, question, completion, failure, interruption/restart; choose mechanism and verify handoff/status integration.

## How we build — written

- [x] `references/how-we-build/README.md` — customizable TDD/tracer defaults; optional project-root `scripts/` convention distinguished from skill-internal scripts.
- [x] `references/how-we-build/qa.md` — independent product QA; difficult/impossible QA means blocked and requirements returned to user.
- [x] Domain starting guidance: `servers.md`, `services.md`, `frontends.md`, `native-applications.md`; gaps identified and filled collaboratively.

## Templates — written

- [x] `PRODUCT-README.md`, `ARCHITECTURE-README.md` explain purpose; ask user to add substantive guidance when empty.
- [x] `AGENTS.md` starter includes required QA section.
- [x] `BACKLOG.md` starter explains quick capture vs official TASKS and includes `- [ ] Create README for this repo`.
- [x] `task-card.md`, `task-management-skill.md`, `brainstorm.md`, `task.md`, `outcome.md`; see template README.

## Skill-internal scripts — boundary documented; implementation deferred

- [x] `scripts/README.md` distinguishes factory-internal scripts from optional project-root scripts and explains why generic automation is not guessed.
- [ ] Implement worker registry/launch and worktree/integration helpers after harness/task-system selection; add tests for concurrency, failure, restart, cleanup.

## End-to-end check — PAUSE BEFORE STARTING

- [ ] First tell the user the documentation/skill is ready for review; wait for user to increase model and request workflow analysis.
- [ ] With the stronger model, think through typical development workflows and identify missing coverage.
- [ ] Then validate setup → capture/promote → plan → dispatch → implement/QA → merge/archive, including shared human/orchestrator visibility.
- [ ] Reconcile docs and test in a temporary project; no obsolete approval gates.
