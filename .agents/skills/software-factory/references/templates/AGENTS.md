# Project agent instructions

Project-specific instructions for all agents working in this repository. Keep these concise, actionable, and consistent with `PRODUCT/` and `ARCHITECTURE/`.

## Invariants and conventions

- [Project rules, compatibility constraints, security/privacy requirements]

## Structure and architecture

- [Important directories/modules and where changes belong]

## Commands

- Run the project: `[command]`
- Run tests: `[command]`
- Other useful checks/data setup: `[command]`

## Logging and debugging

- [How to inspect useful logs and diagnose failures; do not expose secrets]

## QA — required

Describe how to operate and observe the actual product independently of the implementation. Include required environment/data, scripts or accessibility/test selectors, and visual verification steps. Passing tests or reviewing code alone is not product QA. If independent QA cannot be performed for a task, mark it blocked and report what is missing.

## When the orchestrator completes long tasks
If the orchestrator performs any task, including planning tasks that take longer than 10 tool calls in series, then if on the mac, use the `say` command to update the user. `say "<sentence about task status or the work just completed>`