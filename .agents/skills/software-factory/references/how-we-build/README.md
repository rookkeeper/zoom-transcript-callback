# How we build

These are starting recommendations, not universal laws. During setup, discuss the user's practices and adapt or replace this guidance. Prefer TDD where practical, thin end-to-end tracer-bullet slices over completing one architectural layer at a time, and useful logging that makes failures diagnosable.

## Common project affordances

Agree on reliable run, test, QA, and build commands. A root-level `scripts/` directory is an optional project convention: a language-agnostic, makefile-like index of common commands such as running the app, testing, querying a database, or generating mock data. It is distinct from scripts that implement this skill.

For substantial work:

1. Confirm the intended user-visible behavior and acceptance criteria.
2. Design a small vertical slice through the relevant layers.
3. Add/update tests alongside implementation; prefer tests first where appropriate.
4. Exercise the running product independently of the code that implemented it.
5. Keep docs and task checklists in sync.

## Independent QA

Read [qa.md](qa.md). Project and domain guidance should define concrete commands, access paths, data, and affordances that an independent verifier can use. UI QA should prefer reliable scripted interaction; visual screenshots remain useful evidence. If QA is difficult or impossible, mark the task blocked and tell the orchestrator what project affordance or decision is missing.

## Domain guidance

- [Servers](servers.md)
- [Services](services.md)
- [Frontends](frontends.md)
- [Native applications](native-applications.md)

These references are deliberately starting points. Extend them for the actual project and identify unsupported domains rather than silently guessing.
