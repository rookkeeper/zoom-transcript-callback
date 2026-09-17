# Auto-retry plus longer idle watchdog

> Created after the developer explicitly agreed on the direction (2026-09-17). Records decisions, not hypotheses.

## Context

Two consecutive stall failures (Ethan Plunk 31b7cd6d, then fafb8eb8) with identical signature: Pi warnings, then zero stdout until the 180s idle watchdog killed a healthy-but-slow job. The Ethan manual retry succeeded (~2.5 min silent first-token on a 152KB transcript), proving the idle timeout — not credentials, models, or env — is the main issue. This repo also carries unrelated uncommitted work (ui, prompts, ARCHITECTURE); this change touches only the processor/config/tests/docs listed below.

## Decision details

- Raise the idle watchdog default from 3 min to 10 min (`src/config.mjs`, `PI_IDLE_TIMEOUT_MS` default), matching `PI_TIMEOUT_MS`. The overall timeout still bounds runaways; the idle timer was murdering slow-but-healthy `--print` runs that emit nothing until done. Configurable via existing `PI_IDLE_TIMEOUT_MS` env.
- Automatic single retry on Pi execution failures (post-spawn `failed`/`incomplete`, not pre-spawn validation errors), with a short backoff delay before the second attempt. New config: `PI_MAX_ATTEMPTS` (default 2), `PI_RETRY_DELAY_MS` (default 60s). Each attempt gets its own activity row linked via `retryOf`; the retry reuses the already-downloaded VTT.
- Keep `scripts/manual-retry.mjs` as the admin escape hatch.
- Docs: README documents the retry behavior and the two knobs.
- Back-compat: purely additive; defaults change only the idle ceiling (3→10 min). No shims retained. Missing/unset env behaves as before except the higher ceiling.
- Non-goals: progress-signal parsing from Pi event streams; overall timeout changes; touching the unrelated dirty files.

## Work checklist

- [ ] Write RED tests for retry (succeeds-after-retry, gives-up-after-max, no-retry-on-validation-failure) and idle default change
- [ ] Implement retry + delay in processor/callback layer with fresh activity rows
- [ ] Raise idle default to 10 min in config
- [ ] Verify RED→GREEN on the new tests; full suite green
- [ ] Document retry + knobs in README and .env.example
- [ ] Reprocess the failed fafb8eb8 run via manual-retry script
- [ ] Commit planning record, implement on worktree/branch, PR, merge
