# Brainstorm

**Status: provisional — not an implementation decision**

## Problem

Cloud recording assets (MP4/M4A/VTT/chat) for recent meetings need downloading into `John's Stuff/Zoom/`. Webhook `download_token`s expire fast; no Zoom API credentials existed. Now a unified General app exists with scopes + tunnel redirect, but the callback server has no `/zoom/oauth` route (proven by the 404 after John clicked Allow — code was issued, tunnel delivered it).

## Investigation

- `src/callback.mjs`: only `POST /zoom/transcripts`; everything else 404.
- `src/config.mjs`: no Zoom OAuth client settings; `.env` has `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` (General app values), stale `ZOOM_ACCOUNT_ID` from the abandoned S2S attempt.
- `.env`/`.env.*` gitignored; `.env.example` already documents the new keys (empty).
- Tests use in-memory repos + loopback servers; good pattern to follow for the new route.

## Options and questions

1. **Persisted OAuth in the server (recommended):** add `GET /zoom/oauth` to the callback listener exchanging `code` → tokens, storing refresh token in a `0600` file beside the DB; add `src/zoomOAuth.mjs` (exchange/refresh) + `scripts/zoom-download.mjs` (list recordings, download all files per meeting). Scopes already granted cover it.
2. **One-shot local script only:** exchange the code from the URL manually. Fragile — codes expire in 60s and John's code is already dead; would need a fresh Allow click anyway.
3. **Keep S2S remnants:** remove `ZOOM_ACCOUNT_ID` usage; General user-OAuth is the path.

Open: token file location (default `./data/zoom-oauth.json`); whether downloader also backfills Hunter/Ethan meetings or just latest.

## Direction

Preferred: option 1. Needs decision gate only on backfill scope; default to latest meeting (Damian) first, others on request.
