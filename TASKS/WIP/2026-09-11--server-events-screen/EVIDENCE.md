# Test evidence

Implementation began after checkpoint commit `7d8e787` on 2026-09-15. No live model call or Peeps mutation was used for validation.

| Slice / command | Red observed | Green observed |
|---|---|---|
| Repository + service, `node --test test/activities.test.mjs` | Initial two tests failed against unimplemented interfaces | Persistence/reopen, filters, metadata, timestamps, terminal protection, recovery passed |
| API, `node --test test/api.test.mjs` | Expected 200, received stub 501 | Query validation, filter delegation, missing/detail lookup passed |
| UI, `node --test test/ui.test.mjs` | Route returned null; client lacked list method | Routes, escaping, empty state, request parameters, errors and stale response handling passed |
| Pi, `node --test test/processor.test.mjs` | All five outcomes incorrectly returned received | Success, exit failure, spawn failure, missing marker and timeout passed; only success writes ledger |
| Service coordination | Expected running, got received from stub `run` | Async completion, repeated-start rejection and thrown failure handling passed |
| Integration, `node --test test/integration.test.mjs` | Application did not compose the two listeners | Signed callback acknowledgment, title before completion, three outcomes, recovery, API retrieval and ingress isolation passed |
| Browser, `npm run test:browser` | Back navigation lost the second expanded row | List/detail/back, expanded rows, pagination, reload, filtering, refresh and missing ID passed |
| Permissions / routes | SQLite mode 0644 instead of 0600; root route returned null | Owner-only file mode and root/malformed routes passed |
| Browser pagination | limit=10 advanced offset by 50 | Custom page size and in-progress filter edits survive navigation/refresh |

`npm test`: 24 tests passed after integration and UI module refactoring. `npm run test:browser`: 2 tests passed (11.5 seconds). Browser fixtures cover 55 synthetic activities across Zoom/future endpoints and all statuses. Screenshots are generated under ignored `test-results/`; the rendered list was visually inspected.

## Deviations and fixture corrections

- The standalone callback HTTP test was added alongside its implementation, without an earlier behavioral red run. The later application integration test did have a red/green cycle, but that does not retroactively satisfy the original callback TDD requirement. The corresponding red API checklist item remains unchecked for this reason.
- Loopback binding initially failed under sandbox restrictions; tests were rerun with permission. This is setup evidence, not behavioral red evidence.
- Playwright initially lacked its matching browser, then a test used a nonexistent explicit button type. Fixed setup/selector; neither counts as behavioral red.
- Node fetch did not send the test's overridden Host header. Replaced that assertion's transport with `http.get`, which exercises the actual wire header.
- A fixture token named `private` collided with the ordinary error phrase “private execution log.” Changed the fixture to a distinctive credential string; redaction assertions then passed.

## Operational limits

Activated 2026-09-15 after checking the old callback had no active child job. LaunchAgent restarted successfully; Node PID 61047 listened on 127.0.0.1 ports 8787 and 8788. The history API initially returned an empty list. A signed local `endpoint.url_validation` smoke test then produced activity `dbb8d654-c069-4c25-8b35-e946223c0ca6`, status succeeded, endpoint `/zoom/transcripts`; its token was absent from stored metadata. Opened the live events page. No real Zoom delivery or live Pi transcript processing was claimed or performed.

History starts with activation; old JSONL is not imported. Each delivery has its own activity, including duplicates. SQLite, execution logs, success ledger and agent note writes are not one atomic transaction. A crash can leave incomplete or mismatched evidence; restart recovery does not replay jobs. Success still relies on Pi's explicit completion marker, not independent verification of every vault write by this server.
