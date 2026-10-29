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
- **Local callback listener:** `http://127.0.0.1:8788/zoom/transcripts`
- **Live transcript UI:** `http://127.0.0.1:8788/live`; setup: [live/README.md](../../../../live/README.md). Same process/port as history; RTMS core remains independent.
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

### Cloud recording layout (required so videos save to cloud)

If cloud videos/audio/transcripts are missing, check here first. The host's settings control the recording, layout settings must be configured before the meeting starts, and cloud layouts cannot be changed retroactively after the meeting begins.

**A. Web portal: Settings → Recording (some accounts label it Recording & Transcript), under Cloud recording:**

- Cloud recording: On
- Zoom Meeting: Checked
- Record active speaker with shared screen: On
- Record gallery view with shared screen: On
- Record active speaker, gallery view and shared screen separately: On
  - Active speaker: On
  - Gallery view: On
  - Shared screen: On
- Record audio-only files: On
  - One audio file for all participants: On
  - Separate audio file for each participant: On
- Create audio transcript: On
- Automatic recording: On → Record in the cloud: Selected
- Optional but useful: Save chat messages On; Record thumbnails when sharing On; Optimize recording for 3rd-party video editor On

Known failure: video saves broke when `Record active speaker with shared screen` and `Record gallery view with shared screen` were off. Both must be On.

**B. Desktop app: Zoom Workplace → profile picture → Settings → Recording:**

- Record video during screen sharing: On
- Show video and screen share side-by-side: Off (leave off to get separate cloud files rather than one combined local-style layout)
- Record separate participant audio files: applies primarily to computer/local recordings; the cloud equivalent is the web-portal audio setting above
- Local recording path: must have enough free space; does not affect cloud recordings

**C. Per-meeting checklist:**

- Confirm the indicator says Recording to the cloud (not local).
- At least two participants with cameras on for a gallery-view file.
- Start an actual screen share for a shared-screen file.
- Layouts cannot be changed after the meeting begins.

### Environment variables

`.env` (gitignored) holds live values; `.env.example` is the audited list and must stay synchronized.

| Variable | Purpose |
|---|---|
| `CALLBACK_HOST`, `SERVER_PORT` | single shared listener; defaults to `127.0.0.1:8788` (single-port application; connector's legacy8787 origin currently needs temporary public-only forwarding) |
| `EVENTS_DATABASE_PATH` | history activity database; `CALLBACK_PORT`/`EVENTS_PORT` retired and ignored |
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
- **Result:** One server on 8788 handles public Zoom endpoints and code-guarded local `/events` and `/live`. Intended tunnel origin is8788; deployment probes found its actual origin remains localhost:8787. No Cloudflare change was made; temporary public-Zoom-path-only forwarding preserves callbacks until that origin is migrated. No RTMS-specific routing rule needed. Private UI/API/assets require loopback peer, local Host, no forwarding headers and same Origin/site. Only /zoom/transcripts, /zoom/oauth and /zoom/rtms accept public ingress.

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
- **Result:** One row per recording file with meeting date, topic, meeting ID, meeting UUID, file type, size, and status. The script uses `/v2/users/me/recordings` and the double-encoded meeting UUID in `/v2/meetings/{uuid}/recordings`.

### Download recording assets

- **User request:** "download the Zoom video," "download the recordings," or "save the meeting assets locally."
- **Procedure:** Run:
  ```bash
  node scripts/zoom-download.mjs --meeting <meetingUuid> [--dir <destination>]
  ```
  By default, files go under `John's Stuff/Zoom/<date> <topic>/` (a `.zoom-meeting-uuid` marker claims the folder for one instance; a second instance with the same date/topic lands in `<date> <topic> 2`, and so on).
- **Result:** Every completed asset is downloaded: video, audio, transcript, chat, timeline, captions, and related files. The script verifies each file by completing the stream and reporting its size.
- **Operational notes:** Re-run a meeting download after flaky large-file chunks. Pass the meeting UUID, not the numeric meeting ID, to disambiguate repeated topics, reused IDs (e.g. a PMI hosting several instances), and meetings crossing midnight UTC.

### Delete cloud recording assets

- **User request:** "delete the Zoom recording" or "remove the cloud recording after downloading."
- **Procedure:** Use the downloader's double opt-in flags:
  ```bash
  node scripts/zoom-download.mjs --meeting <meetingUuid> --delete --yes
  ```
- **Safety:** Confirm the meeting UUID, destination, and successful local verification immediately before deletion. The script refuses `--delete` without `--yes` and leaves the cloud copy if any download fails.
- **Result:** The cloud recording is deleted only after every completed asset verifies locally.

### Retry transcript processing

- **User request:** "retry the failed transcript," "rerun that meeting," or "process the failed callback again."
- **Procedure:** Run:
  ```bash
  node scripts/manual-retry.mjs <meetingUuid>
  ```
- **Result:** A fresh activity row is created and linked to the failed row. Supply the meeting UUID—not the activity ID—to `scripts/manual-retry.mjs`; it finds the failed/incomplete activity for that instance (`metadata.meetingUuid`) and sends the same UUID through the shared asset workflow. The workflow re-fetches/reuses assets, verifies API names against the filesystem, starts Pi from the transcript, and deletes the whole instance from Zoom after verification.

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
- **Processing:** `src/zoom.mjs` extracts meeting metadata, the meeting UUID, and the numeric meeting ID (display only). `src/zoomDownloads.mjs` uses the General-app OAuth API with the double-encoded UUID (`/v2/meetings/{uuid}/recordings`) to retrieve every completed recording asset into `John's Stuff/Zoom/<date> <topic>/` (incremented to `<date> <topic> 2`, … when another instance already claimed the base folder). `src/retry.mjs` passes `details.meetingUuid` into the processor and retries post-spawn failures according to `PI_MAX_ATTEMPTS` and `PI_RETRY_DELAY_MS`.
- **Pi work:** `src/processor.mjs` retrieves the meeting assets before starting Pi, then starts Pi in an isolated directory under `PI_WORK_ROOT`; the prompt is hardwired in `src/zoomPrompt.mjs` and only identifies the callback, supplies callback data, and points Pi to this skill and the loaded skills.
- **Transcript callback workflow:** When a `recording.transcript_completed` callback arrives:
  1. Call `createMeetingJob(config)(meetingUuid)`. One meeting instance in, everything out: the shared workflow fetches every completed asset for that UUID across both of Zoom's collections (`recording_files` and `participant_audio_files`, so per-participant audio is covered), downloads the transcript first, and starts Pi as soon as it lands. The remaining assets download in parallel with three workers while Pi runs.
  2. Only after every completed asset verifies locally (API names against non-empty files on disk) does anything leave Zoom — and then it leaves all at once: the workflow deletes the whole meeting instance (`DELETE /v2/meetings/{uuid}/recordings`), which also removes the transcript, and polls until the meeting endpoint stops listing files. Whole-meeting deletion is eventually consistent: Zoom answers success while the files are still briefly listed, so a single re-list cannot prove removal.
  3. Downloads retry independently with bounded backoff. Files reuse requires an exact API-size match, not merely a nonempty file. Activity status follows the transcript outcome; per-file results expose download failures separately.
  3. Pass the downloaded transcript path and meeting folder to Pi.
  4. Use the `how-to-use-peeps-obsidian` skill to create a new event document for the meeting.
  5. Update existing participant files or create new person files as that skill describes. The event summary must incorporate information from all participants; the Peeps skill's large-meeting LinkedIn limit still applies.
  6. Append and verify the original transcript using the Peeps skill's script.
  7. Only after every required step succeeds, write `zoom-processing-result.json` with `status: completed`.
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
- Missing cloud video/audio/transcript files (only some layouts saved, or nothing saved to cloud) → verify **Setup and configuration → Cloud recording layout** above: web-portal shared-screen options off, automatic cloud recording off, or meeting recorded locally instead of to the cloud are the usual causes.

### Batch download learnings

- Same-named local folders disambiguate by instance: the first instance claims `<date> <topic>/` with a `.zoom-meeting-uuid` marker, later instances use `<date> <topic> 2/`, `<date> <topic> 3/`, …, and re-runs reuse the folder whose marker matches their UUID.
- A meeting that crosses midnight UTC can appear under two dates with identical filenames; verify by meeting UUID.
- Recording fetch and cloud deletion are keyed by meeting UUID (double-encoded in the API path: `encodeURIComponent(encodeURIComponent(uuid))`), never the numeric meeting ID — one numeric ID can host several instances (e.g. a reused PMI), while the UUID identifies exactly one.
- The list flag parser accepts both `--flag value` and `--flag=value` forms.
- Completed large files can fail during transfer; rerun the meeting download rather than deleting the cloud copy. The meeting is deleted whole only after every completed asset verifies locally, so failures never strand a partial delete.
- Whole-meeting deletion (`DELETE /v2/meetings/{uuid}/recordings`) is eventually consistent: Zoom returns success while the meeting endpoint still briefly lists files. Poll until the endpoint 404s or returns an empty list before treating the meeting as gone.
- Prefer the whole-meeting delete over per-file deletion (`DELETE .../recordings/{fileId}`); the latter is only proof of the API shape during exploration, not a production path. The `cloud_recording:delete:meeting_recording` scope covers the whole-meeting delete.
- Zoom splits a meeting's recording assets across two top-level collections: `recording_files` and `participant_audio_files`. Walking only `recording_files` silently leaves one M4A per participant in the cloud forever. Both collections download through the whole-meeting endpoints (`GET`/`DELETE /v2/meetings/{uuid}/recordings`), and participant audio files are identified by their human `file_name`, since they carry no `recording_type`.
