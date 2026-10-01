# Brainstorm: Key recording lookup by meeting UUID, not numeric meeting ID

Official task: `TASKS/KANBAN/meeting-uuid-key.md`
Planning directory: `TASKS/WIP/meeting-uuid-key/`
Execution plan: [todos.md](./todos.md)
Status: planning

Orchestrator: gather initial details, inspect relevant code, and append numbered Q&A rounds at the end. User: answer questions inline. Preserve prior rounds, user wording, and unresolved concerns; a messy chronological record is fine. Continue until both parties agree implementation can proceed in isolation, then populate todos.md.

## Initial user details

User report (2026-10-01): two different meetings share numeric ID `87850645500` ("Ride Along – John builds") and get processed incorrectly. Zoom recording-detail URLs differ by `meeting_id` param: `1in20%2FL2QcWjtTp5hFfzcQ%3D%3D` (09:53 CT, 2h37m, 12 files, transcript OK) vs `3zvnh0h9QCGfx%2FkuigKUoQ%3D%3D` (12:48 CT, 12s, 3 files, "Unable to transcribe"). Those URL params are the meeting UUIDs. User asked: figure out how to distinguish these using the API. User then authorized filing + implementing as first run-through of the implementation (worker) instructions, asking to be told at every step.

Live API verification (2026-10-01): `GET /v2/meetings/{double-encoded uuid}/recordings` resolves each UUID to its own instance distinctly. The numeric-ID endpoint returned the stub's 3-file asset list — the collision that caused the `No completed transcript` failure on the real recording's callback.

Code inspection: numeric `meetingId` is the key in `src/meetingJob.mjs` (`processMeeting(meetingId)` → `listAssets(config, meetingId)`), `src/assetArchive.mjs` (`listAssets`, `deleteMeeting`), `src/zoomDownloads.mjs` (`downloadMeetingAssets`), `src/retry.mjs` (`processor(details.meetingId, id)`), `scripts/manual-retry.mjs` and `scripts/process-meeting.mjs` (CLI takes meeting ID; retry lookup matches `metadata.meetingId`). The webhook payload already carries `object.uuid`; `transcriptDetails` extracts it as `meetingUuid` and it is stored in activity metadata but never used for fetching. Local folder naming (`DEFAULT_ZOOM_ROOT/<date> <topic>`) has no instance disambiguation.

## Round 1 — decided (2026-10-01, user answers in chat, recorded by orchestrator)

1. **Scope: migrate everything to UUIDs.** Webhook path plus all manual scripts (`zoom-download.mjs`, `zoom-list.mjs`, `manual-retry.mjs`, `process-meeting.mjs`) — full migration, no numeric-ID keying left.
   **Answer:** migrate everything to UUIDs.

2. **Folder disambiguation: append an integer.** When another event with the same name exists, append an integer past it (`<date> <topic> 2`, etc.), incrementing for each same-named meeting.
   **Answer:** append incrementing integer for same-named meetings.

3. **`manual-retry` works just like the webhook.** It should call the same function — the meeting-processing function that takes the UUID. Operator passes UUID; lookup matches `meetingUuid`.
   **Answer:** same function as webhook, UUID in, match on `meetingUuid`.

4. **Cloud deletion goes by UUID.** `deleteMeeting` uses the UUID so only the processed instance's assets are deleted.
   **Answer:** delete by UUID.

5. **Product QA: live run acceptable.** Live run against the real 09:53 instance (`1in20/L2QcWjtTp5hFfzcQ==`) is approved — full pipeline including Peeps writes, downloads, and cloud delete-after-verify.
   **Answer:** go for the live run.
