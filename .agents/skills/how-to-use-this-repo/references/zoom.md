# Zoom integration

> **Path reminder:** paths in this reference are relative to the repo root
> (`.../zoom-transcript-callback/`).

Use this reference for Zoom setup, recording operations, callbacks, transcript processing, and failure recovery. Both the callback and API client use one unified Zoom **General app**.

## General facts

- **Repository:** `/Users/johnberryman/projects/github/rookkeeper/zoom-transcript-callback`
- **Zoom app management:** [https://marketplace.zoom.us/user/build](https://marketplace.zoom.us/user/build)
- **Current General-app authorization URL:**
  ```text
  https://zoom.us/oauth/authorize?response_type=code&client_id=Bxu8tCqbQdeUqCaOV39aZA&redirect_uri=https://dev-callbacks.arcturus-labs.com/zoom/oauth
  ```
- **Public callback endpoint:** `https://dev-callbacks.arcturus-labs.com/zoom/transcripts`
- **Public OAuth redirect:** `https://dev-callbacks.arcturus-labs.com/zoom/oauth`
- **Local callback listener:** `http://127.0.0.1:8787/zoom/transcripts`
- **Local history UI:** [http://127.0.0.1:8788/events](http://127.0.0.1:8788/events)
- **Durable reminder:** use the current authorization URL when scopes change and the app must be reauthorized. Authorization codes expire quickly, so the callback route must be live before opening it.
- **Durable reminder:** the public hostname belongs to the Cloudflare tunnel; the server itself binds to loopback and does not know its public hostname.

## Setup and configuration

### Zoom app

- Go to [the created-apps page](https://marketplace.zoom.us/user/build).
- Use one **General app**. It is unlisted/private during development.
- A General app is required here because this integration needs both event subscriptions and `cloud_recording` API scopes. Server-to-Server OAuth cannot access the recording files, and webhook-only apps do not provide the required API credentials.
- OAuth redirect URL: `https://dev-callbacks.arcturus-labs.com/zoom/oauth`.
- Enable Event Subscriptions and add `recording.transcript_completed` with endpoint `https://dev-callbacks.arcturus-labs.com/zoom/transcripts`.
- Put the event-subscription Secret Token in `ZOOM_WEBHOOK_SECRET`.
- Activate the app or tokens will not issue (`invalid_client`: "app has been disabled").

### Scopes

Take plain variants where offered; skip `:admin`/`:master` unless an endpoint demands them.

| Scope | Why |
|---|---|
| `cloud_recording:read:list_user_recordings` | list meetings ("List all recordings") |
| `cloud_recording:read:list_recording_files` | per-meeting file/download URLs ("Get meeting recordings") |
| `cloud_recording:read:recording` | read recording details |
| `cloud_recording:read:meeting_transcript` | transcript endpoint |
| `cloud_recording:delete:recording_file` | trash one video/audio file without touching the rest |
| `cloud_recording:delete:meeting_recording` | whole-meeting delete; retained as a fallback, but prefer per-file deletion |
| `user:read:user` | resolve the current user for API calls |
| `user:read:settings`, `user:read:list_schedulers` | granted with the user family; not directly used |

### User OAuth

General apps authorize per user, not per account. Open the current authorization URL above, click **Allow**, and Zoom redirects through the tunnel to `GET /zoom/oauth?code=...`. The server exchanges the code and stores the refresh token in `ZOOM_OAUTH_STORE_PATH`.

Adding a scope later requires reauthorization with the same URL; new tokens overwrite the stored token. Verify granted scopes with:

```bash
python3 -c "import json; print(json.load(open('data/zoom-oauth.json'))['scope'])"
```

### Environment variables

`.env` (gitignored) holds live values; `.env.example` is the audited list and must stay synchronized.

| Variable | Purpose |
|---|---|
| `CALLBACK_HOST`, `CALLBACK_PORT` | webhook listener bind; defaults to `127.0.0.1:8787` |
| `EVENTS_PORT`, `EVENTS_DATABASE_PATH` | local history UI and activity database |
| `ZOOM_WEBHOOK_SECRET` | HMAC verification of Zoom events |
| `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | General-app OAuth credentials for recording downloads |
| `ZOOM_TOKEN_URL` | OAuth token endpoint; defaults to `https://zoom.us/oauth/token` |
| `ZOOM_REDIRECT_URI` | must match the app's OAuth redirect URL |
| `ZOOM_OAUTH_STORE_PATH` | persisted user tokens; defaults to `./data/zoom-oauth.json` |
| `ZOOM_SUCCESS_LOG_PATH` | completed-transcript ledger |
| `PI_CLI_PATH`, `PI_MODEL`, `PI_SESSION_TITLE_PREFIX`, `PI_SKILLS_ROOT` | Pi executable, model, session naming, and skill root |
| `PI_TIMEOUT_MS`, `PI_IDLE_TIMEOUT_MS`, `PI_MAX_ATTEMPTS`, `PI_RETRY_DELAY_MS` | processing timeout, silence ceiling, retry attempts, and backoff |
| `PI_EXECUTION_LOG_PATH`, `PI_WORK_ROOT` | Pi lifecycle log and private job directories |
| `DEEPSEEK_API_KEY` | model provider key for Pi jobs |
| `MAX_WEBHOOK_BODY_BYTES`, `MAX_WEBHOOK_AGE_SECONDS` | request validation limits |

Retired: `ZOOM_ACCOUNT_ID` (old Server-to-Server remnant; General user OAuth does not use it). Retired: `PI_PATH_PREFIX` (the processor now preflights `obsidian` on `PATH`).

## Standard operating protocol

These are the operations the agent can perform when the user asks about Zoom. Always confirm destructive operations immediately before execution, and never expose or log secrets, OAuth tokens, transcript content, or client secrets.

### Start or restart the callback server

- **User request:** "start the Zoom callback," "restart the Zoom app," or "bring the callback back up."
- **Procedure:** From the repository root, run `./scripts/run-server.sh`. Production normally runs under the LaunchAgent `com.rookkeeper.zoom-transcript-callback`.
- **Result:** The callback listens on port 8787 and the history UI on port 8788.

### Reauthorize the Zoom app

- **User request:** "reauthorize Zoom," "I changed scopes," or "open the Zoom authorization page."
- **Procedure:** Ensure the callback and public tunnel are live, then open the current authorization URL from **General facts**. The user clicks **Allow**.
- **Safety:** Authorization codes expire in approximately 60 seconds. Do not ask the user to reuse an old code.
- **Result:** The server stores refreshed OAuth tokens in `data/zoom-oauth.json` or the configured `ZOOM_OAUTH_STORE_PATH`.

### List meetings and recording assets

- **User request:** "list my Zoom recordings," "find the meeting," or "show the available assets."
- **Procedure:** Run:
  ```bash
  node scripts/zoom-list.mjs --from YYYY-MM-DD --to YYYY-MM-DD [--json]
  ```
- **Result:** One row per recording file with meeting date, topic, meeting ID, file type, size, and status. The script uses `/v2/users/me/recordings` and `/v2/meetings/{id}/recordings`.

### Download recording assets

- **User request:** "download the Zoom video," "download the recordings," or "save the meeting assets locally."
- **Procedure:** Run:
  ```bash
  node scripts/zoom-download.mjs --meeting <meetingId> [--dir <destination>]
  ```
  By default, files go under `John's Stuff/Zoom/<date> <topic>/`.
- **Result:** Every completed asset is downloaded: video, audio, transcript, chat, timeline, captions, and related files. The script verifies each file by completing the stream and reporting its size.
- **Operational notes:** Re-run a meeting download after flaky large-file chunks. Use the meeting ID, not only the date/topic, to disambiguate repeated topics and meetings crossing midnight UTC.

### Delete cloud recording assets

- **User request:** "delete the Zoom recording" or "remove the cloud recording after downloading."
- **Procedure:** Use the downloader's double opt-in flags:
  ```bash
  node scripts/zoom-download.mjs --meeting <meetingId> --delete --yes
  ```
- **Safety:** Confirm the meeting ID, destination, and successful local verification immediately before deletion. The script refuses `--delete` without `--yes` and leaves the cloud copy if any download fails.
- **Result:** The cloud meeting recording is deleted only after all completed files verify locally.

### Retry transcript processing

- **User request:** "retry the failed transcript," "rerun that meeting," or "process the failed callback again."
- **Procedure:** Run:
  ```bash
  node scripts/manual-retry.mjs <failedActivityId>
  ```
- **Result:** A fresh activity row is created and linked to the failed row. The meeting's assets are retrieved again through the Zoom API and placed in the standard `John's Stuff/Zoom/<date> <topic>/` folder.

### Inspect callback history

- **User request:** "show what happened with the Zoom callback" or "inspect the failed job."
- **Procedure:** Open [http://127.0.0.1:8788/events](http://127.0.0.1:8788/events), or query the activity ledger directly:
  ```bash
  sqlite3 data/events.sqlite "SELECT title, receivedAt, status, substr(error,1,100) FROM activities ORDER BY receivedAt DESC LIMIT 10;"
  ```
- **Result:** Activity rows show received, running, succeeded, failed, and incomplete callback attempts.

## Callbacks

### `recording.transcript_completed`

- **Endpoint:** `https://dev-callbacks.arcturus-labs.com/zoom/transcripts` forwards to local `POST /zoom/transcripts`.
- **Verification:** `src/callback.mjs` verifies Zoom's HMAC signature and timestamp using `ZOOM_WEBHOOK_SECRET`. It answers `endpoint.url_validation` and returns `202` before model work.
- **Processing:** `src/zoom.mjs` extracts meeting metadata and the meeting ID. `src/zoomDownloads.mjs` uses the General-app OAuth API to retrieve every completed recording asset into `John's Stuff/Zoom/<date> <topic>/`. `src/retry.mjs` runs the Pi processor, retrying post-spawn failures according to `PI_MAX_ATTEMPTS` and `PI_RETRY_DELAY_MS`.
- **Pi work:** `src/processor.mjs` retrieves the meeting assets before starting Pi, then starts Pi in an isolated directory under `PI_WORK_ROOT`; the prompt is hardwired in `src/zoomPrompt.mjs` and only identifies the callback, supplies callback data, and points Pi to this skill and the loaded skills.
- **Transcript callback workflow:** When a `recording.transcript_completed` callback arrives:
  1. Use the meeting ID with the Zoom API to retrieve all completed meeting assets into `John's Stuff/Zoom/<date> <topic>/`. Reuse non-empty files already in that folder.
  2. Pass the downloaded transcript path and meeting folder to Pi.
  3. Use the `how-to-use-peeps-obsidian` skill to create a new event document for the meeting.
  4. Update existing participant files or create new person files as that skill describes. The event summary must incorporate information from all participants; the Peeps skill's large-meeting LinkedIn limit still applies.
  5. Append and verify the original transcript using the Peeps skill's script.
  6. Only after every required step succeeds, write `zoom-processing-result.json` with `status: completed`.
- **Downstream skill:** For the Obsidian updates, Pi must use the `how-to-use-peeps-obsidian` skill. That skill governs person searches, event-note creation, participant links, log entries, and transcript-appending rules. Do not duplicate its detailed note-format rules here.
- **Success evidence:** A completed marker, a successful activity row, and an entry in `logs/zoom-transcript-success.jsonl`.
- **Failure evidence:** `data/events.sqlite` records the activity; `logs/zoom-transcript-pi.jsonl` records Pi lifecycle output with tokens redacted. Failed jobs can be retried with `manual-retry.mjs`.

## Scheduled events

No scheduled events are currently configured for Zoom.

When adding one, record its schedule and timezone, trigger and inputs, the operation or callback it invokes, expected output, and failure/retry/notification behavior in this section.

### Future scheduled event placeholder

- **Schedule/timezone:** `<not configured>`
- **Trigger and inputs:** `<describe the future trigger and inputs>`
- **Action:** `<name the operation or callback to invoke>`
- **Output and notification:** `<describe expected output and who is notified>`
- **Failure/retry:** `<describe retry and escalation behavior>`

## Diagnostics and troubleshooting

### Fastest evidence path

1. Query the activity ledger:
   ```bash
   sqlite3 data/events.sqlite "SELECT title, receivedAt, status, substr(error,1,100) FROM activities ORDER BY receivedAt DESC LIMIT 10;"
   ```
2. For stalls or unclear exits, inspect the matching request ID in `logs/zoom-transcript-pi.jsonl`.
3. Check whether the expected event note and participant updates exist in the Peeps vault; defer completion rules to the `how-to-use-peeps-obsidian` skill.
4. Use `node scripts/zoom-list.mjs` for Zoom's cloud ground truth and inspect `John's Stuff/Zoom/` for local assets.

### Common signatures

- `OBSIDIAN_CLI_MISSING` → the server process lacks Obsidian's CLI directory on `PATH`; check the LaunchAgent environment.
- `Invalid signature` → an unsigned or stale callback probe; inspect timestamp and webhook secret configuration.
- `Pi timed out` → the overall Pi timeout was reached; inspect the Pi log and retry only after checking whether the work is safe to repeat.
- `Pi stalled with no output` → Pi has exceeded the configured silence ceiling, often while waiting for a slow first model response on a large transcript; a retry may recover.
- A pair of rows about 60 seconds apart with `retryOf` metadata → original callback plus automatic retry; inspect both attempts before retrying manually.

### Batch download learnings

- Repeated date/topic names need a `[meetingId]` suffix when organizing local folders.
- A meeting that crosses midnight UTC can appear under two dates with identical filenames; verify by meeting ID.
- The list flag parser accepts both `--flag value` and `--flag=value` forms.
- Completed large files can fail during transfer; rerun the meeting download rather than deleting the cloud copy.
