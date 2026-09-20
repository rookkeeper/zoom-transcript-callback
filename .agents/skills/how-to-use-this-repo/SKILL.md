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
| Zoom meeting processing: callback flow, Pi prompt setup, recording downloads, Zoom app setup (type, scopes, env vars) | [references/zoom.md](references/zoom.md) |

## Repo layout (stable)

- `src/` — server source (`callback.mjs`, `processor.mjs`, `pi.mjs`, `retry.mjs`, `zoom.mjs`, `zoomOAuth.mjs`, `oauthCallback.mjs`, `config.mjs`, …).
- `test/` — `node:test` suites mirroring `src/`; run with `npm test`.
- `prompts/` — the Pi instruction templates. `zoom-transcript.md` is the live prompt (HTML comments stripped at load); `zoom-transcript.example.md` documents every `{{placeholder}}`.
- `scripts/` — `run-server.sh` (start/restart), `manual-retry.mjs` (re-run a failed job), `send-fake-request.sh` (signed local test), `zoom-download.mjs` (pull recording assets via API).
- `ui/` — local history screen served on the events port (`/events`).
- `ARCHITECTURE/` — server, database, UI design notes. `PRODUCT/overview.md` — product intent.
- `CHANGES/` — dated lifecycle records per change (`BRAINSTORM.md`, `TODO.md`, `WORKSTEPS.md`, `OUTCOMES.md`).
- `data/` (`events.sqlite`, `zoom-oauth.json`) and `logs/` (`zoom-transcript-pi.jsonl`, `zoom-transcript-success.jsonl`) are runtime state: gitignored, never commit.
- `.env` holds secrets (gitignored). `.env.example` is the audited list of required variables — keep it in sync when adding or removing `process.env.*` reads.

## Rules for every change

- Follow the development-lifecycle skill: change directory under `CHANGES/`, work on a worktree branch, TDD new behavior, PR, merge, clean up.
- Never log or commit secrets, download tokens, or transcript content. Tests use fake tokens and in-memory databases.
- When adding an env var, add it to `.env.example` with a comment in the same commit.
