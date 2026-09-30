# AGENTS.md

Start here before doing anything in this repo:

- Read `/Users/johnberryman/projects/github/rookkeeper/zoom-transcript-callback/.agents/skills/how-to-use-this-repo/SKILL.md`
- That skill is authoritative for repo layout, rules, and per-domain references. Paths in it are relative to this repo root.

## What lives here

For now this repo is mostly one thing: a local Zoom webhook adapter.

- `src/` — server source. Entry `index.mjs`; `callback.mjs` (Zoom `recording.transcript_completed` verification + accept), `processor.mjs` + `pi.mjs` (download assets, spawn Pi job that updates the Peeps Obsidian vault), `zoom.mjs` / `zoomOAuth.mjs` / `zoomDownloads.mjs` / `oauthCallback.mjs`, `zoomPrompt.mjs` (Pi prompt + `{{placeholder}}` contract), `config.mjs`, `activities.mjs` / `database.mjs` / `api.mjs` / `admin.mjs` / `application.mjs` / `repository.mjs` / `retry.mjs`.
- `test/` — `node:test` suites mirroring `src/` (`npm test`); plus Playwright UI tests (`npm run test:browser`).
- `scripts/` — `run-server.sh` (start/restart), `send-fake-request.sh` (signed local test), `manual-retry.mjs`, `process-meeting.mjs`, `zoom-download.mjs`, `zoom-list.mjs`.
- `ui/` — local history screen served on the events port (`/events`).
- `ARCHITECTURE/` — `server.md`, `database.md`, `ui.md`.
- `PRODUCT/overview.md` — product intent.
- `CHANGES/` — dated lifecycle records per change (`BRAINSTORM.md`, `TODO.md`, `WORKSTEPS.md`, `OUTCOMES.md`).
- `TASKS/` — work tracking (`WIP`).
- `README.md` — full setup (Zoom app, Pi, Cloudflare Tunnel, LaunchAgent, testing).
- `.env.example` — audited list of required env vars; `.env` holds secrets (gitignored, never commit).
- `data/` and `logs/` — runtime state (sqlite, oauth json, jsonl logs); gitignored, never commit.

## What to do next

- `BACKLOG.md` is the list of next things to do here (new endpoints, infra moves, renames). Check it when prioritizing work, and keep it updated as scope grows beyond Zoom.
