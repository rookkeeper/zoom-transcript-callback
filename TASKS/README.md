# Local task guidance

The [software-factory skill](../.agents/skills/software-factory/SKILL.md) owns workflow guidance alongside project constraints in [AGENTS.md](../AGENTS.md). Explicit user-directed exceptions apply to the chosen task; preserve unrelated changes, safety, privacy, and the no-nesting constraint. This documentation maintenance was authorized directly in the existing checkout without separate task/worktree scaffolding.

## Artifact lifecycle

- Quick capture: root `BACKLOG.md` uses plain bullets; remove promoted ideas after safely recording them in official cards.
- Official Markdown cards live in `TASKS/KANBAN/` while active. Preserve their frontmatter, status history, and decisions.
- Planning: create undated `TASKS/PLANNING/<task>/brainstorm.md` and `todos.md`, linking the directory immediately from the card. Preserve Q&A; finalize the execution plan only after explicit brainstorming completion.
- Dispatch: move planning artifacts to `TASKS/WIP/YYYY-MM-DD-<task>/` using the actual dispatch date. Update headers and card references; commit the move before default worktree provisioning. Branches, worktrees, and task IDs remain undated.
- Completion: keep the same dispatch-date name under `TASKS/COMPLETE/YYYY-MM-DD-<task>/`; include `outcome.md`, practical usage instructions, and verification evidence. Archive the Markdown card there with the artifacts; update links and status only when actually complete.
- Product verification is mandatory; tests alone are not QA. A user-attended walkthrough is optional; ask for large tasks, and record any requested walkthrough as an explicit approval gate before integration. See [QA guidance](../.agents/skills/software-factory/references/quality-assurance.md) and the isolation gaps in `AGENTS.md`.

## Existing records: preserve uncertainty

- [app-logging](KANBAN/app-logging.md) moved to [PLANNING](PLANNING/app-logging/brainstorm.md): triage card, no assigned worker/base commit, and explicit deferred implementation. Round 1 decisions remain intact; `simplify-architecture`, ledger overlap, and QA planning still need resolution before dispatch. Existing draft checklists are not dispatch authorization.
- [meeting-uuid-key](KANBAN/meeting-uuid-key.md) remains in undated `TASKS/WIP/meeting-uuid-key/`: the triage card conflicts with implementation/worktree checkmarks in its todos. Verify actual state and original dispatch date before any move or status change.
- [success-ledger-all-exits](KANBAN/success-ledger-all-exits.md) remains in undated `TASKS/WIP/success-ledger-all-exits/`: todos records implemented work awaiting integration in an external worktree. Verify that workspace, integration state, and original dispatch date before migration. No date is inferred here.
- Historical `TASKS/COMPLETE/` directories and completed cards still on `KANBAN/` are retained, not bulk-migrated or reclassified. New work follows the lifecycle above.

## Pending product and operating decisions

- WebMCP for the framework-free `ui/` remains undecided: at relevant planning, agree whether to expose any capabilities, which workflows, contracts, runtime support, permissions/confirmation, and verification. No integration is authorized by this maintenance. Preserve loopback-only history/API and forwarded-request rejection.
- There is no native Mac application here; AppleScript/SDEF guidance is inapplicable unless that product scope changes. Running a Node service on macOS does not create an SDEF requirement.
- Keep existing scripts and framework-free UI. Factory backend/frontend recommendations do not mandate a stack rewrite. `scripts/run-server.sh` overwrites environment values from `.env` and kills existing listeners; isolated, ownership-aware start/seed/inspect/stop QA affordances are a documented gap, not implemented here. Live Zoom/Pi verification requires explicit safe data/access planning because processing can write vault notes and delete cloud recordings.
- The local Pi worktree-launch validation recorded in `AGENTS.md` is still unproven; do not infer verified capabilities from a redeployed adapter.
