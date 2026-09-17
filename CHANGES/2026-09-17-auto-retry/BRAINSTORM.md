# Brainstorm

**Status: provisional — not an implementation decision**

## Problem

The Ethan Plunk meeting (2026-09-16) failed with "Pi stalled with no output for 180s" — a transient stall on the first large-context model call. A manual retry the next day succeeded fully (person note, event note, transcript appendix, both logs). The Greg Ceccarelli meeting showed the same pattern (timeout → manual retry → success). Transient Pi failures currently require human-noticed manual reruns, or the meeting is silently lost.

## Investigation

- `src/processor.mjs`: single-shot Pi spawn with overall timeout + idle watchdog; no retry. Outcomes: succeeded / failed / incomplete.
- `src/callback.mjs`: acknowledges 202 then `activities.run(id, () => processor(details, id))`.
- `src/activities.mjs`: `ActivityService.run()` wraps processor, finishes row with status/error.
- `scripts/manual-retry.mjs` (new, untracked): proves retry works by re-running the real processor with a fresh activity row, reusing the downloaded VTT. One-shot script, not server behavior.
- Tests: `test/processor.test.mjs` covers timeout/idle paths with injected spawn/kill fakes.

## Options and questions

1. **Automatic single retry in the server** (recommended): on `failed`/`incomplete` (not validation failures), re-run the processor once with a fresh activity row linked via `retryOf`, reusing the job dir's VTT. Config: `PI_MAX_ATTEMPTS` (default 2), maybe `PI_RETRY_DELAY_MS`.
   - Risk: doubles worst-case latency/cost for genuinely broken jobs. Mitigate: retry only idle-timeout/stall and non-zero-exit classes, not validation errors (those fail before Pi spawns).
   - Where: `application` layer (wrapping processor call in callback) vs inside processor. Recommend callback/application level so each attempt gets its own activity row and the ledger stays honest.
2. **Retry endpoint in admin UI**: manual "retry" button per failed row. More work, still human-in-the-loop. Could follow later.
3. **Tune the idle watchdog instead**: the Ethan first-token took ~2.5 min (152KB context). Bumping `PI_IDLE_TIMEOUT_MS` default would have avoided this one kill, but slow-first-token vs hung-call are indistinguishable from outside — retry is the robust fix. Do both: modest idle default increase + auto-retry.

Open: retry delay (immediate vs backoff)? Which failure classes qualify? Keep `manual-retry.mjs` as the admin tool or remove once server retries?

## Direction

Preferred (pending developer confirmation — though developer pre-authorized: "if it works, make the changes"): server-side single automatic retry on Pi execution failures with fresh activity row + `retryOf` link, plus keep the manual script; document in README. Exact failure-class filter and delay need the decision gate.
