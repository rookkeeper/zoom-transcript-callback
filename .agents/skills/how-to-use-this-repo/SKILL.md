---
name: how-to-use-this-repo
description: >-
  Navigate and operate this repo. Use when working inside
  zoom-transcript-callback: finding where the callback, processor, prompt,
  scripts, docs, or configuration live; processing Zoom meetings; managing
  Zoom app credentials, scopes, and environment variables. Start here before
  changing behavior.
---

# How to use this repo

> **Path reminder:** paths in this skill are relative to the repo root
> (`.../zoom-transcript-callback/`), not your current working directory.

This repo is a local webhook adapter: Zoom sends a `recording.transcript_completed`
event, the server downloads the transcript, and a Pi agent updates the Peeps
Obsidian vault. It will grow beyond Zoom, so each integration gets its own
reference file. Read only the one you need.

## Contents

| Area | Reference |
|---|---|
| Domain-reference structure for facts, setup, operations, callbacks, schedules, and diagnostics when adding a new domain | [references/domain-template.md](references/domain-template.md) |
| Zoom meeting processing: callback flow, Pi prompt setup, recording downloads, Zoom app setup (type, scopes, env vars) | [references/zoom.md](references/zoom.md) |

## Domain reference convention

Every new integration domain gets its own reference file under `references/`, following [the domain template](references/domain-template.md). Keep durable, non-secret facts and reminders there, along with setup, the standard operating protocol, callbacks, scheduled events, and diagnostics.

Route requests to the matching section:

- account facts, URLs, IDs, or reminders → **General facts**;
- credentials, scopes, permissions, redirects, or deployment → **Setup and configuration**;
- an operation the agent should perform on request → **Standard operating protocol**;
- an inbound webhook or provider notification → **Callbacks**;
- a recurring or time-based job → **Scheduled events**;
- a failure, status check, or recovery question → **Diagnostics and troubleshooting**.

## Repo layout (stable)

- `src/` — server source (`callback.mjs`, `processor.mjs`, `pi.mjs`, `retry.mjs`, `zoom.mjs`, `zoomOAuth.mjs`, `oauthCallback.mjs`, `config.mjs`, …).
- `test/` — `node:test` suites mirroring `src/`; run with `npm test`.
- `src/zoomPrompt.mjs` — the internal Pi transcript-processing prompt and its `{{placeholder}}` contract.
- `scripts/` — `run-server.sh` (start/restart), `manual-retry.mjs` (re-run a failed job), `send-fake-request.sh` (signed local test), `zoom-download.mjs` (pull recording assets via API).
- `ui/` — local history screen served on the events port (`/events`).
- `ARCHITECTURE/` — server, database, UI design notes. `PRODUCT/overview.md` — product intent.
- `TASKS/` — see `TASKS/README.md`: `KANBAN/` official cards; undated `PLANNING/<task>/{brainstorm.md,todos.md}`; dispatch-dated `WIP/YYYY-MM-DD-<task>/`; `COMPLETE/YYYY-MM-DD-<task>/` for finished artifacts, archived cards, and `outcome.md`. Keep the dispatch date at completion. `BACKLOG.md` is quick capture, not the board.
- `data/` (`events.sqlite`, `zoom-oauth.json`) and `logs/` (`zoom-transcript-pi.jsonl`, `zoom-transcript-success.jsonl`) are runtime state: gitignored, never commit.
- `.env` holds secrets (gitignored). `.env.example` is the audited list of required variables — keep it in sync when adding or removing `process.env.*` reads.

## Rules for every change

- The `software-factory` skill (`.agents/skills/software-factory`, symlinked and gitignored) owns workflow guidance alongside project constraints. Follow its planning, dispatch, verification, integration, and user-directed workflow procedures; see `TASKS/README.md` for local paths and legacy exceptions.
- Load the applicable factory references: [backend service](../software-factory/references/how-we-build/backend-service.md), [web frontend](../software-factory/references/how-we-build/web-frontend.md), and [quality assurance](../software-factory/references/quality-assurance.md). These are recommendations, not a mandate to replace this repo's framework-free UI. WebMCP remains a pending product choice (see `TASKS/README.md`); no native Mac app/SDEF surface exists here.
- Never log or commit secrets, download tokens, or transcript content. Tests use fake tokens and in-memory databases.
- When adding an env var, add it to `.env.example` with a comment in the same commit.

## Rules for changing this skill
- This repo has callbacks and interactions across several domains. If a change requires absolute generality, then you can change this file. But if it's related into one of the subdomains mentioned in references, then opt for changing that first.
