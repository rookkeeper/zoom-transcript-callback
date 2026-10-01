# Brainstorm: Consistent application logging with actionable processor errors

Official task: `TASKS/KANBAN/app-logging.md`
Planning directory: `TASKS/WIP/app-logging/`
Execution plan: [todos.md](./todos.md)
Status: planning

Orchestrator: gather initial details, inspect relevant code, and append numbered Q&A rounds at the end. User: answer questions inline. Preserve prior rounds, user wording, and unresolved concerns; a messy chronological record is fine. Continue until both parties agree implementation can proceed in isolation, then populate todos.md.

## Initial user details

User request (2026-10-01): “Ride Along – John builds” failed — review logs to figure out why. Follow-up: “In the process, if you find an error that's not logged well, then let's add some more log lines. Maybe we don't have proper consistent application logging and it's time to invest in that and clean up.”

So scope is two parts: (a) nail the triggering failure's cause, (b) fix the logging gap it exposed, as a consistent application-logging cleanup rather than a one-off log line.

## Triggering failure: diagnosis (2026-10-01, from the live system)

- **Failed rows:** `bc84843b-0ce0-45f6-9e94-2c99626223ec` (POST, 19:54:57Z) and `4d4bf34b-6122-4d0b-8f21-5af3ed887183` (AUTO_RETRY attempt 2, 19:55:58Z), title “Ride Along – John builds”, error text `Processor failed; inspect execution log`.
- **What the row error means:** the string is generic — `src/activities.mjs` `ActivityService.run()` catches any processor throw and records that fixed text. The real error never reaches the row.
- **What the stderr log shows:** only `{"event":"processor_failed","activityId":"...","code":"Error"}` for each attempt — `src/index.mjs` logs `error.code || error.name`, and a plain `Error` has neither, so it degrades to `"Error"`. No message, no stack, no meeting/request ID.
- **What the Pi log shows:** nothing for either request ID — no `pi_started` for meeting `87850645500`. The processor threw before Pi spawned.
- **Root cause:** meeting `87850645500` has **no completed TRANSCRIPT asset** in Zoom's API (verified live: only MP4 active_speaker, M4A audio_only, TIMELINE timeline, all `completed`). `src/assetArchive.mjs` `getRecordingIndex()` throws `No completed transcript`, which propagates out of `createMeetingJob().processMeeting()` → `activities.run()` catch → generic row error. The meeting folder `2026-10-01 Ride Along – John builds` exists locally but is empty (mkdir happens before the transcript check). Consistent with the still-incomplete live transcript: Zoom emits `recording.transcript_completed` but the transcript file isn't yet returned as `completed` by the recordings API.
- **Permanent:** Zoom UI shows "Unable to transcribe" for this meeting's audio transcript — no transcript will ever arrive. Do NOT retry; the failure is terminal for transcript processing. (User confirmed 2026-10-01.)

### Code path (for the worker)

1. `src/callback.mjs` → `runTranscriptJob({processor})` with `processor = createMeetingJob(config)` i.e. `processMeeting(meetingId, requestId)`.
2. `src/retry.mjs` → `activities.run(id, () => processor(details.meetingId, id))`.
3. `src/meetingJob.mjs` `processMeeting`: `await getIndex(config, meetingId)` (= `getRecordingIndex`) throws `No completed transcript` → `Promise.allSettled` never starts → throw propagates.
4. `src/activities.mjs` `run()` catch: `console.error(JSON.stringify({event:'processor_failed',activityId:id,code:error.code||error.name}))`, row finished `failed` with `Processor failed; inspect execution log`.

### Logging inventory (current state, for cleanup planning)

| Source | Destination | Format | Gaps |
|---|---|---|---|
| `src/index.mjs` catch in `activities.run` | stderr → `~/Library/Logs/zoom-transcript-callback-error.log` | ad-hoc JSON `{event:'processor_failed',activityId,code}` | no message/stack/meetingId/requestId |
| `src/processor.mjs` `log()` | `logs/zoom-transcript-pi.jsonl` | JSONL with request/meeting context | only covers post-`createProcessor` life; pre-spawn meeting-job failures never reach it |
| `logs/zoom-transcript-success.jsonl` | ledger | JSONL | success-only on main (`success-ledger-all-exits` branch extends to all Pi exits, unmerged — coordinate) |
| `src/index.mjs` listener errors, `callback.mjs` catch | stderr/stdout | ad-hoc JSON / bare | no shared helper, no level/context convention |
| sqlite `activities.error` | `data/events.sqlite` → `/events` UI | free text | generic text for all processor throws |

## Round 1 — decided (2026-10-01, user answers)

1. **Scope: full cleanup in one go.** No thin slice; do the whole logging cleanup as one task.
2. **Pre-spawn failures fail fast.** No auto-retry for missing-transcript and similar pre-spawn failures (the AUTO_RETRY on `87850645500` burned an attempt with the same result; with "Unable to transcribe" the transcript never lands).
3. **`success-ledger-all-exits` overlap: deferred** — to be discussed separately before implementation.
4. **Consolidate into one conventional application log** (single destination, filterable structured JSONL), replacing the stderr/Pi-JSONL/ledger split for operational failures.
5. **QA deferred** — not implementing immediately, so no QA planning now. No retry of meeting `87850645500` (transcript permanently gone).
