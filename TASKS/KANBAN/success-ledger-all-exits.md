---
id: "success-ledger-all-exits"
title: "Log every Pi exit to the completion ledger"
status: in-progress
created: "2026-09-29"
touched: "2026-09-30"
tags: [pi, logging, ledger]
---

# Log every Pi exit to the completion ledger

## Desired outcome

Turn the success ledger into a completion ledger so it answers "what happened to every meeting?" without joining the execution log against the SQLite activity table.

## Acceptance criteria

- [x] One ledger row per finished Pi job, whatever the outcome.
- [x] Success keeps the existing `transcript_processed` event name and shape (additive `status` field only).
- [x] Non-success exits emit `transcript_failed` with the same job context and the failure reason.
- [x] Pre-spawn failures are logged too, with no `pid`.
- [x] No SQLite schema change and no retry-behavior change.

## Planning artifacts

Planning directory: `TASKS/WIP/success-ledger-all-exits/`

## Planning and implementation checklist

- [x] Review relevant PRODUCT/ and ARCHITECTURE/ guidance.
- [x] Implement the ledger change and cover every outcome with tests.
- [x] Maintain product and architecture documentation.
- [ ] Sync with current `main`.
- [ ] Open and validate the PR.
- [ ] Merge locally, record the outcome, and clean up the worktree.

## Notes / activity

Implementation commit `ab7b157` on branch `success-ledger-all-exits` is complete and tested but **not merged into `main`**, so the ledger change is not live. Planning commit on `main` is `f636264`.

Worktree note: this task's worktree lives at `/Users/johnberryman/projects/github/rookkeeper/_worktrees/success-ledger-all-exits`, outside the factory's `<repo>/.worktrees/<task-name>` convention. Relocation is pending the user's call, because the branch carries in-flight work.
