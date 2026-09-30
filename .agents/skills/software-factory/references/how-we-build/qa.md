# Independent product QA

QA must operate and observe the actual product independently of its implementation. Code review and passing unit/integration tests are valuable but are not, by themselves, evidence that a user-facing product works.

## Plan QA with the task

Before implementation, identify important user journeys, observable success/failure behavior, required test data, and the independent means of operating the product. Record acceptance criteria in the task and project-specific affordances in `AGENTS.md`.

Prefer scripted interaction when it genuinely operates the product and checks its results. Stable accessibility identifiers, accessibility trees, test IDs, CLI entry points, or purpose-built helpers can make QA repeatable. Use human/computer interaction when scripts cannot adequately verify the experience. Capture relevant screenshots for visual/layout changes; capture only the application/window, not the full desktop, where privacy or focus matters.

## Verify, report, escalate

- Exercise representative end-to-end paths on the running application.
- Verify the observed state/results, not merely that commands exited successfully.
- Include relevant evidence, commands, environment assumptions, and limitations in the outcome.
- If QA is not feasible because access, instrumentation, environment, or agreed criteria are missing, mark the task blocked and tell the orchestrator what is needed. Do not label implementation tests as independent product QA.
