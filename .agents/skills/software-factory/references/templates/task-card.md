---
id: "<stable-id>"
title: "<short task name>"
status: triage # adapt to chosen board; promotion alone does not mean ready
created: "<date>"
touched: "<date>"
board_order: <optional-number>
tags: []
# Optional relationships/capabilities; use only if the task system supports them.
# priority: <optional>
# parent: <optional-task-id>
# subtasks: []
# blocked_by: []
---

# <Task title>

## Desired outcome

<What should change and why?>

## Acceptance criteria

- [ ] <Observable result>

## Planning artifacts

Planning directory: <exact TASKS/WIP/<task>/ path; populated by orchestrator when planning begins>

## Planning and implementation checklist

- [ ] Review relevant PRODUCT/ and ARCHITECTURE/ guidance.
- [ ] Orchestrator: create brainstorm.md and todos.md from templates, gather user details, and iterate inline Q&A until both parties agree the requirements and QA plan.
- [ ] Orchestrator: populate the execution checklist and verify both WIP files before dispatch.
- [ ] Worker: review all WIP documents, then implement the agreed task and maintain todos.md.
- [ ] Run agreed tests and independent product QA.
- [ ] Record outcome and evidence; update this card and link completed artifacts.

## Notes / activity

<Visible comments, decisions, blockers, or links. Keep blocker rationale here or in the task system's activity log.>
