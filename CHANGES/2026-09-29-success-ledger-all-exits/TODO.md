# Log every Pi exit to the success ledger

## Context

The success ledger (`logs/zoom-transcript-success.jsonl`, via `ZOOM_SUCCESS_LOG_PATH`) currently receives a `transcript_processed` row only when Pi exits 0 **and** writes a `completed` marker. Failed, timed-out, stalled, and incomplete jobs leave no trace there, so the ledger cannot answer "what happened to every meeting?" — the user must join the execution log against the sqlite activity table instead.

## Decision details

- The success ledger becomes a **completion ledger**: one row per finished Pi job, whatever the outcome.
- Keep the existing `transcript_processed` event name and shape for the success path (backwards compatible for any readers).
- Non-success exits get a distinct event (e.g. `transcript_failed`) carrying the same job context (`requestId`, `meetingUuid`, `meetingId`), the Pi `pid` when available, the `status` (`failed`/`incomplete`), the `error` string, and whatever metadata exists (asset info, notePaths/summary when present).
- Pre-spawn failures (asset download failure, `OBSIDIAN_CLI_MISSING`, spawn errors) already return before the child exists; decision: log those too, with no `pid`, since they are also terminal exits for the meeting. (Agreed implicitly by "any other type of exit"; confirm during review if this overreaches.)
- Non-goals: no schema change to sqlite; no change to retry behavior; no rename of the file or env var in this change.

## Work checklist

- [ ] Emit a ledger row for every terminal Pi outcome (success, failed, incomplete, pre-spawn failure).
- [ ] Update `test/processor.test.mjs` to assert a ledger row exists for every outcome with the right event/status.
- [ ] Update README + skill reference wording (success ledger → completion ledger semantics).
- [ ] Run `npm test` and complete the final review.
