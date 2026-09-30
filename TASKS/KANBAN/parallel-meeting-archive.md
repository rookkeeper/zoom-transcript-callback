---
id: "parallel-meeting-archive"
title: "Process meetings by ID with parallel download-and-delete archive"
status: complete
created: "2026-09-29"
touched: "2026-09-30"
tags: [zoom, downloads, concurrency]
---

# Process meetings by ID with parallel download-and-delete archive

## Desired outcome

Offer one meeting-ID entry point that runs Obsidian processing and asset archiving concurrently, archives assets with bounded workers, and deletes each cloud file right after it is verified locally so retries never re-download.

## Acceptance criteria

- [x] `createMeetingJob(config)(meetingId, requestId?)` is the single entry point used by the webhook and manual scripts.
- [x] Transcript/agent processing and media archiving run in parallel.
- [x] Three media workers each download, verify, atomically promote, then delete one cloud asset.
- [x] Downloads retry with backoff; reuse requires an exact API-size match or a completed-download receipt.
- [x] Transcript stays in Zoom; agent success is not erased by media failure.

## Planning artifacts

Completed artifacts: `TASKS/COMPLETE/parallel-meeting-archive/`

## Planning and implementation checklist

- [x] Implement `src/meetingJob.mjs` and `src/assetArchive.mjs`.
- [x] Cover worker limits, partial-file replacement, and delete-after-verify with tests.
- [x] Reprocess meeting `86729424602` live and confirm cloud deletion.
- [x] Record outcome and evidence.

## Notes / activity

Implemented directly on `main` at the user's explicit request (the direct-on-main exception in the software-factory skill). Live run deleted nine assets and left only the transcript. Commits `5e61ff9`, `4bbbaee`.
