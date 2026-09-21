# Zoom integration

> **Path reminder:** paths here are relative to the repo root
> (`.../zoom-transcript-callback/`).

Two halves: (1) the **callback** — Zoom pushes an event, Pi processes the
meeting; (2) the **API client** — we pull recording assets on demand. Both
run under one unified Zoom **General app**.

## 1. Meeting processing (callback)

Flow: `Zoom → POST /zoom/transcripts → Pi job → Peeps vault`.

Public ingress is a Cloudflare tunnel (`dev-callbacks.arcturus-labs.com → http://127.0.0.1:8787`); the server itself binds loopback only and never knows its public hostname. If the tunnel is down or the Mac is asleep, Zoom retries briefly, then the event is missed — reprocessing happens via `manual-retry.mjs` once a transcript exists, or not at all.

- `src/callback.mjs` — verifies the HMAC signature (`ZOOM_WEBHOOK_SECRET`), answers `endpoint.url_validation`, then hands `recording.transcript_completed` payloads to the retry runner. Acknowledges 202 before model work.
- `src/zoom.mjs` — `transcriptDetails()` extracts meeting metadata plus the transcript `download_url` and temporary `download_token`.
- `src/processor.mjs` — spawns Pi (`--print`, tools `bash,read,edit,write`) in a private job dir under `PI_WORK_ROOT`. Overall timeout `PI_TIMEOUT_MS`; idle watchdog `PI_IDLE_TIMEOUT_MS` (Pi emits nothing until done, so this must exceed the longest quiet stretch — large transcripts take minutes before first output). Success requires Pi to write `zoom-processing-result.json` with `status: completed`.
- `src/retry.mjs` — `runTranscriptJob()` retries post-spawn failures (`PI_MAX_ATTEMPTS`, default 2; `PI_RETRY_DELAY_MS` backoff, default 60s). Each attempt is a fresh activity row linked via `retryOf`. Pre-spawn failures ("Pi could not start") are not retried.
- `src/pi.mjs` — Pi arg construction, required skills (`how-to-use-peeps-obsidian`, `obsidian-general-usage` from `PI_SKILLS_ROOT`), token redaction in logs.

### Where the Pi instructions live

`prompts/zoom-transcript.md` is the live prompt. It tells Pi to: download the transcript to `./zoom-transcript.vtt` (reusing a valid existing file), follow the Peeps skill to create/update person and `#event` notes, append the transcript via the skill's `append_transcript.py` script, verify the appendix, then write the completion marker. `{{placeholders}}` are filled from the webhook payload; see `prompts/zoom-transcript.example.md` for the full list. **Edit the `.md` to change Pi's behavior** — HTML comments are stripped at load, so they are safe for developer notes.

### Operating it

- Start/restart: `./scripts/run-server.sh` (loads `.env`, kills the old listener, `npm start`). Production runs under a LaunchAgent; see README "Start automatically on macOS".
- History UI: `http://127.0.0.1:8788/events` (local only).
- Failed job? `node scripts/manual-retry.mjs <activityId>` re-runs with a fresh row, reusing the downloaded VTT.
- Test locally: `./scripts/send-fake-request.sh validation|transcript`.
- Evidence: `data/events.sqlite` (activity ledger), `logs/zoom-transcript-pi.jsonl` (Pi lifecycle; tokens redacted), `logs/zoom-transcript-success.jsonl` (completed ledger).

## 2. Recording downloads (API client)

- `src/zoomOAuth.mjs` — user-OAuth exchange/refresh plus an authenticated `api.zoom.us` helper. Tokens persist in `ZOOM_OAUTH_STORE_PATH` (default `./data/zoom-oauth.json`, mode `0600`).
- `src/oauthCallback.mjs` — `GET /zoom/oauth` exchanges the `code` Zoom redirects back and stores tokens. Served on the same callback listener (reached via tunnel).
- To connect: open the Zoom authorize URL for the app (`https://zoom.us/oauth/authorize?response_type=code&client_id=<id>&redirect_uri=<uri)`), approve, Zoom redirects through the tunnel to `/zoom/oauth`. Auth codes expire in ~60s, so approve promptly after the route is live.

### Listing meetings and assets

`node scripts/zoom-list.mjs --from YYYY-MM-DD --to YYYY-MM-DD [--json]` — one row per recording file (date, topic, file type/recording type, size, status) across every meeting in range. Accepts both `--flag value` and `--flag=value`. Requires stored OAuth tokens; hits `/v2/users/me/recordings` then per-meeting `/v2/meetings/{id}/recordings`.

### Downloading assets

`node scripts/zoom-download.mjs --meeting <meetingId> [--dir <dest>] [--delete --yes]` — downloads every `completed` file (video/audio/transcript/chat/timeline/captions) into `John's Stuff/Zoom/<date> - <topic>/` by default. `--delete` (requires `--yes`) deletes the cloud recording only after all files verify. Skips non-`completed` files.

Batch learnings (Sep 2026, 23 meetings / 136 files / 12 GB):
- Same `date - topic` repeats across meetings — disambiguate colliding folders with a `[meetingId]` suffix.
- A meeting continued past midnight UTC appears under two dates with identical filenames; verify by meeting ID, not filename.
- The flag parser accepts space- and equals-separated values; keep it that way in new scripts.
- Failures to expect: flaky chunks on 100MB+ MP4s (re-run the meeting; completed files re-download idempotently), and the list endpoint defaulting to an empty range when `--from`/`--to` are malformed.

## 3. Zoom app setup (do this on marketplace.zoom.us)

- **Go to:** Zoom App Marketplace → Develop → Build App. **Type: General app** (unlisted keeps it private). It is the only type that supports *both* event subscriptions and the `cloud_recording` scopes — Server-to-Server OAuth cannot access recording files; webhook-only apps have no API credentials.
- **OAuth redirect URL:** `https://dev-callbacks.arcturus-labs.com/zoom/oauth` (Zoom rejects `localhost`; must be public HTTPS).
- **Event subscription:** enable, add `recording.transcript_completed`, endpoint URL `https://dev-callbacks.arcturus-labs.com/zoom/transcripts`. The Secret Token from this subscription → `ZOOM_WEBHOOK_SECRET`. The running server answers Zoom's `url_validation` automatically.
- **Scopes.** Take plain variants where offered; skip `:admin`/`:master` unless the endpoint demands it. Current set with reasons:
  | Scope | Why |
  |---|---|
  | `cloud_recording:read:list_user_recordings` | list meetings ("List all recordings") |
  | `cloud_recording:read:list_recording_files` | per-meeting file/download URLs ("Get meeting recordings") |
  | `cloud_recording:read:recording` | read recording details |
  | `cloud_recording:read:meeting_transcript` | transcript endpoint |
  | `cloud_recording:delete:recording_file` | trash one video/audio file without touching the rest |
  | `cloud_recording:delete:meeting_recording` | whole-meeting delete (kept as fallback; prefer per-file) |
  | `user:read:user` | resolve your own user for API calls |
  | `user:read:settings`, `user:read:list_schedulers` | granted with the user family; not directly used |
- **Activate** the app or tokens will not issue (`invalid_client`: "app has been disabled").

### Approval (user OAuth) flow

General apps authorize per user, not per account. The agent builds the authorize URL from `ZOOM_CLIENT_ID` + `ZOOM_REDIRECT_URI` and opens it (`open "https://zoom.us/oauth/authorize?response_type=code&client_id=<id>&redirect_uri=<uri>"`). John clicks **Allow**; Zoom redirects through the tunnel to `GET /zoom/oauth?code=...`; the server exchanges the code and stores tokens in `ZOOM_OAUTH_STORE_PATH`. Codes expire in ~60s, so the route must be deployed *before* opening the URL. Adding a scope later requires re-approval via the same URL — new tokens overwrite the store. Verify granted scopes with `python3 -c "import json; print(json.load(open('data/zoom-oauth.json'))['scope'])"` before using a new capability.

## 4. Environment variables

`.env` (gitignored) holds live values; `.env.example` is the audited list — update both together.

| Variable | Purpose |
|---|---|
| `CALLBACK_HOST`, `CALLBACK_PORT` | webhook listener bind (default `127.0.0.1:8787`) |
| `EVENTS_PORT`, `EVENTS_DATABASE_PATH` | local history UI + activity DB |
| `ZOOM_WEBHOOK_SECRET` | HMAC verification of Zoom events (Secret Token from the event subscription) |
| `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | General app OAuth credentials for recording downloads |
| `ZOOM_TOKEN_URL` | override, default `https://zoom.us/oauth/token` |
| `ZOOM_REDIRECT_URI` | must match the app's OAuth redirect URL |
| `ZOOM_OAUTH_STORE_PATH` | persisted user tokens, default `./data/zoom-oauth.json` |
| `ZOOM_SUCCESS_LOG_PATH` | completed-transcript ledger |
| `PI_CLI_PATH`, `PI_MODEL`, `PI_SESSION_TITLE_PREFIX`, `PI_SKILLS_ROOT` | Pi executable, model pin, session naming, skills root |
| `PI_TIMEOUT_MS`, `PI_IDLE_TIMEOUT_MS`, `PI_MAX_ATTEMPTS`, `PI_RETRY_DELAY_MS` | overall timeout, silence ceiling, retry attempts + backoff |
| `PI_EXECUTION_LOG_PATH`, `PI_WORK_ROOT` | Pi lifecycle log, private job dirs |
| `DEEPSEEK_API_KEY` | model provider key for Pi jobs |
| `MAX_WEBHOOK_BODY_BYTES`, `MAX_WEBHOOK_AGE_SECONDS` | request validation limits |

Retired: `ZOOM_ACCOUNT_ID` (Server-to-Server remnant; General user-OAuth does not use it — remove if present). Retired: `PI_PATH_PREFIX` (removed Sep 2026; the processor preflights `obsidian` on PATH instead and fails fast with `OBSIDIAN_CLI_MISSING` — ensure the LaunchAgent PATH includes the Obsidian CLI directory).

## 5. Reviewing meetings and debugging failures

Fastest path first — query the ledger directly (the `:8788` UI shows the same data, slower):

```bash
sqlite3 data/events.sqlite "SELECT title, receivedAt, status, substr(error,1,100) FROM activities ORDER BY receivedAt DESC LIMIT 10;"
```

Then, in order, stopping at the first answer:

1. **Error self-explanatory?** `OBSIDIAN_CLI_MISSING`, `Invalid signature`, and `Pi timed out` diagnose themselves. Pairs 60s apart with `retryOf` metadata are original + auto-retry — check whether the retry is even capable of helping (it cannot fix missing binaries or bad signatures).
2. **Needs Pi forensics?** `grep <requestId-prefix> logs/zoom-transcript-pi.jsonl` — full stdout/stderr per attempt. Only needed for stalls and unclear exits.
3. **Did Peeps get updated?** `ls -t` the vault root — a missing dated event note means nothing was processed. A complete event has: summary, key themes, action items, full `# Transcript` appendix matching the source, and `## Log` links on *both* John's note and the participant's note.
4. **Do the assets exist?** `zoom-list.mjs` for cloud ground truth; `John's Stuff/Zoom/` for local copies.

Common signatures: `OBSIDIAN_CLI_MISSING` → server process predates the LaunchAgent PATH edit (check with `ps -o etime= -p <pid>`); `Invalid signature` on a `Callback received` row → unsigned probe, normal noise; `Pi stalled with no output` → slow first token on a large transcript, retry usually recovers.
