# Zoom transcript callback

A small local webhook adapter that receives Zoom's `recording.transcript_completed` event and starts one Pi transcript-processing job.

```text
Zoom → HTTPS /zoom/transcripts → this process → Pi → Peeps Obsidian vault
```

This prototype runs on the Mac. If the Mac is asleep or the callback/tunnel is unavailable, Zoom may retry for a limited period and the event can be missed.

## Prerequisites

### Zoom

The ordinary cloud-meeting transcript event requires, according to [Zoom's event documentation](https://developers.zoom.us/docs/api/meetings/events/#tag/recording/postrecording.transcript_completed):

- Business, Education, or Enterprise Zoom license;
- cloud recording enabled for the relevant users;
- audio transcription enabled for cloud recordings;
- a Zoom Marketplace app with Event Subscriptions enabled;
- a valid public HTTPS Event Notification Endpoint URL;
- the **Recording transcript files have completed** subscription under **Recording**;
- an appropriate recording-read scope, such as `recording:read` (choose the least-privileged scope available for the app);
- the app's webhook secret token.

Zoom sends `endpoint.url_validation` during setup. The callback handles that challenge. Normal requests are authenticated using the `x-zm-request-timestamp` and `x-zm-signature` headers and the raw body. Zoom requires a 2xx response within three seconds.

The event payload includes meeting metadata, a completed transcript recording file, its `download_url`, and a temporary `download_token`. The configured prompt passes those values to the agent, which is responsible for downloading and processing the transcript. Treat the token and transcript as sensitive.

### Pi

Install and authenticate [Pi](https://github.com/badlogic/pi-mono) for the model you want to use. The LaunchAgent runs Pi non-interactively with the `how-to-use-peeps-obsidian` skill from `PI_SKILLS_ROOT`, plus the shell and file tools needed to download a transcript and update the vault. The Obsidian CLI executable must be available; a separate CLI skill is not required.

Each job receives its private temporary directory in the prompt. Pi downloads the original transcript to `zoom-transcript.vtt`, creates the event note, and runs the Peeps skill's `scripts/append_transcript.py` with that local file. The prompt requires verification of the bottom-of-note transcript appendix before writing the completion marker. Temporary job files remain available for diagnosis until the operating system clears them.

## Configuration

```bash
cp .env.example .env
```

Edit `.env`:

- `ZOOM_WEBHOOK_SECRET` — Zoom's webhook secret token.
- `PI_CLI_PATH` — Pi executable, defaulting to `pi`.
- `PI_PATH_PREFIX` — directory prepended to Pi's `PATH`; defaults to the macOS Obsidian CLI directory.
- `PI_MODEL` — optional Pi model ID. Leave blank to use Pi's configured default.
- `PI_SKILLS_ROOT` — parent directory containing the required Peeps and Obsidian skills.
- `PI_TIMEOUT_MS` — maximum time for one Pi job, defaulting to 10 minutes. A timeout is logged and terminates the job process group.
- `PI_EXECUTION_LOG_PATH` — append-only JSONL log of Pi lifecycle events, stdout, stderr, and errors. Temporary Zoom bearer tokens are redacted.
- `ZOOM_SUCCESS_LOG_PATH` — append-only JSONL log of transcript jobs that Pi explicitly marked completed after its Peeps updates.
- The editable prompt is [`prompts/zoom-transcript.md`](prompts/zoom-transcript.md). See [`prompts/zoom-transcript.example.md`](prompts/zoom-transcript.example.md) for a simple example and the complete placeholder reference.

Start or restart the callback with:

```bash
./scripts/run-server.sh
```

The script loads `.env` safely, installs the npm dependencies, stops any process listening on the configured callback port, and starts the server. It listens by default at `127.0.0.1:8787/zoom/transcripts`.

### Start automatically on macOS

After cloning the merged repository, create a LaunchAgent so the callback starts when you log in:

```bash
cd /Users/johnberryman/projects/github/rookkeeper/zoom-transcript-callback
mkdir -p ~/Library/LaunchAgents ~/Library/Logs

cat > ~/Library/LaunchAgents/com.rookkeeper.zoom-transcript-callback.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.rookkeeper.zoom-transcript-callback</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/johnberryman/projects/github/rookkeeper/zoom-transcript-callback/scripts/run-server.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/johnberryman/projects/github/rookkeeper/zoom-transcript-callback</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>/Users/johnberryman</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/johnberryman/Library/Logs/zoom-transcript-callback.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/johnberryman/Library/Logs/zoom-transcript-callback-error.log</string>
</dict>
</plist>
PLIST

label=com.rookkeeper.zoom-transcript-callback
domain="gui/$(id -u)"
launchctl bootout "$domain/$label" 2>/dev/null || true
launchctl bootstrap "$domain" "$HOME/Library/LaunchAgents/$label.plist"
launchctl kickstart -k "$domain/$label"
```

Check the service and its logs:

```bash
launchctl print "gui/$(id -u)/com.rookkeeper.zoom-transcript-callback"
tail -f ~/Library/Logs/zoom-transcript-callback.log
```

This LaunchAgent starts at login and restarts the callback if it exits. It reads `.env` through `run-server.sh` without sourcing or printing it.

## Cloudflare Tunnel

Cloudflare Tunnel is the recommended first public-ingress option. It makes an outbound connection from the Mac, so no inbound firewall port is needed.

Requirements:

- a Cloudflare account;
- a domain managed by Cloudflare for a stable named hostname;
- `cloudflared` installed on the Mac;
- a named tunnel and published application route to `http://127.0.0.1:8787`.

Create the tunnel in **Cloudflare Dashboard → Networking → Tunnels**, install the Mac connector, and add a route such as:

```text
zoom-hook.example.com → http://127.0.0.1:8787
```

Configure Zoom's Event Notification Endpoint URL as:

```text
https://zoom-hook.example.com/zoom/transcripts
```

Publish only this callback service. Never route the Rook server's port through the tunnel. Do not put interactive Cloudflare Access authentication in front of this endpoint; Zoom cannot complete an interactive login. The callback's HMAC verification is the application-level authentication.

Tailscale is useful for private Mac administration. A normal Tailscale address is not a public Zoom endpoint; Tailscale Funnel is an alternative public-ingress design but is not required here.

## Testing

The local history screen is at **http://127.0.0.1:8788/events**. Its JSON API provides `GET /api/events` (optional `endpoint`, `status`, `limit`, `offset`) and `GET /api/events/:id`. `EVENTS_PORT` changes this separate local port; do not route it through Cloudflare. Forwarded requests and nonlocal Host headers are rejected. The public callback listener exposes no history routes.

Activities persist in `data/events.sqlite`, configurable with `EVENTS_DATABASE_PATH`. Schema version 1 initializes automatically; a newer unsupported version stops startup. Stop the server before copying the database for backup, or use SQLite's online backup facility. Keep the database and any WAL files together during recovery. There is no historical JSONL import: the new history begins when this version starts.

The database tracks callback attempts, including validation and rejection. Pi's execution JSONL remains the detailed diagnostic log, and the success JSONL remains the append-only completed-transcript ledger. These are separate files, not one atomic transaction; a disk failure or crash between writes can leave differing evidence. Startup marks abandoned active database rows incomplete rather than guessing success or replaying them.

For activation, wait until Pi jobs have finished, then restart the existing LaunchAgent with `launchctl kickstart -k "gui/$(id -u)/com.rookkeeper.zoom-transcript-callback"`. Check both listeners and the startup log. Forced restarts can interrupt work; the launcher has a short forced-stop grace period. Ordinary SIGTERM to the Node process drains active jobs, but an external supervisor may enforce its own timeout.

See [product intent](PRODUCT/overview.md), [server interfaces](ARCHITECTURE/server.md), [UI layers](ARCHITECTURE/ui.md), and [database schema](ARCHITECTURE/database.md). A future callback supplies its own verification, endpoint/type/title, selected metadata and processor to the same activity service.

Run unit tests:

```bash
npm test
npx playwright install chromium
npm run test:browser
```

Tests use temporary databases, fake Pi processes, and synthetic browser fixtures. They do not call a model or update Peeps. Browser tests bind port 18788; HTTP integration tests use temporary loopback ports.

With the server running in another terminal, send signed local test requests:

```bash
./scripts/send-fake-request.sh validation
./scripts/send-fake-request.sh transcript
```

The validation request should return Zoom's validation response. The transcript request should return `{"accepted":true}` and launch Pi. Use `validation` first; `transcript` starts a Pi session and uses the fake download URL.

Before configuring Zoom, test the full local path with a signed fixture and a fake `pi` executable. Then use Zoom's validation control in the Marketplace app. The callback returns before Pi finishes. Inspect the callback process logs, `PI_EXECUTION_LOG_PATH`, and `ZOOM_SUCCESS_LOG_PATH` when debugging.

## Security notes

- Keep `.env` private and never commit it.
- Do not log request bodies, transcript content, Zoom download tokens, or Rook auth tokens.
- Keep the callback bound to loopback; expose it only through the tunnel.
- Enforce the request age and body-size limits.
- The webhook payload is untrusted meeting data. The callback uses a fixed Pi executable, skill list, model setting, and prompt file; payload values cannot configure code execution.
- Each accepted callback starts a new Pi session in an isolated private working directory.
