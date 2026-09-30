---
id: "zoom-oauth-downloads"
title: "Zoom OAuth token exchange plus recording downloader"
status: complete
created: "2026-09-18"
touched: "2026-09-20"
tags: [zoom, oauth, downloads]
---

# Zoom OAuth token exchange plus recording downloader

## Desired outcome

Give the callback server a working Zoom General-app OAuth connection so it can list and download cloud recording assets without relying on short-lived webhook `download_token`s.

## Acceptance criteria

- [x] `GET /zoom/oauth` route exchanges the auth code and stores tokens in a `0600` JSON file.
- [x] `src/zoomOAuth.mjs` supports code exchange, refresh rotation, and bearer API calls.
- [x] `scripts/zoom-download.mjs` lists and downloads a meeting's assets, with double opt-in for cloud deletion.
- [x] Processor fails fast with a greppable error when the Obsidian CLI is missing.
- [x] README and `.env.example` document the OAuth setup.

## Planning artifacts

Completed artifacts: `TASKS/COMPLETE/zoom-oauth-downloads/`

## Planning and implementation checklist

- [x] Red tests for code exchange, refresh rotation, and route behavior.
- [x] Implement the OAuth module, route, and config keys.
- [x] Verify against a live authorization click and download a real meeting.
- [x] Record outcome and evidence.

## Notes / activity

Merged as PR #2 (`b1e64b9`). Adopted one unified General app (webhook + `cloud_recording` scopes) instead of the abandoned Server-to-Server attempt; `ZOOM_ACCOUNT_ID` retired.
