# Zoom OAuth token exchange plus recording downloader

> Created after the developer explicitly agreed on the direction (2026-09-18, unified General app plan). Records decisions, not hypotheses.

## Context

A unified General Zoom app now holds webhook + `cloud_recording` scopes. Clicking Allow issued an auth code that reached the Mac via the tunnel but 404'd: the server has no `/zoom/oauth` route. That code has expired; a fresh Allow click will be needed once the route exists.

## Decision details

- Add `GET /zoom/oauth` to the callback listener: exchanges `code` → tokens via Zoom, stores them in a `0600` JSON file (default `./data/zoom-oauth.json`, configurable via `ZOOM_OAUTH_STORE_PATH`), renders a plain success page.
- New `src/zoomOAuth.mjs`: code exchange, refresh-token rotation, bearer `api.zoom.us` helper. Secrets stay in `.env` (gitignored), never logged.
- New `scripts/zoom-download.mjs`: resolves user, lists recordings, downloads all files (video/audio/transcript/chat) for a chosen meeting into `John's Stuff/Zoom/<date> <topic>/`.
- First target: latest meeting (Damian Arnsdorff, Sep 17). Hunter/Ethan backfill on request.
- Remove reliance on stale `ZOOM_ACCOUNT_ID` (S2S remnant); document General-app user OAuth in README/`.env.example`.
- Back-compat: purely additive route + files; no existing behavior changes, no shims.

## Work checklist

- [ ] RED tests for code exchange (fake token endpoint), refresh rotation, route behavior (stores tokens, rejects missing code/state)
- [ ] Implement `src/zoomOAuth.mjs` + `/zoom/oauth` route + config keys
- [ ] Verify RED→GREEN; full suite green
- [ ] Restart server, fresh Allow click, confirm token capture
- [ ] Download latest meeting assets into `John's Stuff/Zoom/`
- [ ] Document OAuth setup + downloader in README/`.env.example`
- [ ] PR, merge, cleanup
