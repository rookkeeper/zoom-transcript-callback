# Complete: original public/private routing retained

## Final result

User clarified that no Cloudflare changes and secure private pages matter, not port consolidation. Targeted restoration preserved useful RTMS work rather than reverting the feature. Implemented directly on main under the explicit user override; source commit **f19f37d**.

**One process, original two ports:**

- Public **127.0.0.1:8787**: POST /zoom/transcripts, GET /zoom/oauth, POST /zoom/rtms only.
- Local **127.0.0.1:8788**: /events, /live, their APIs/assets. Loopback binding plus peer/local Host/no forwarding/same Origin/site guards.
- Recording and RTMS cores remain independent; thin composition starts both and manages shutdown. No recording/Pi/database business-logic changes.
- Existing Cloudflare origin `http://localhost:8787` is **unchanged**. No new rule/hostname, no compatibility forwarding and no standalone live agent.
- Existing `com.rookkeeper.zoom-transcript-callback` LaunchAgent owns both listeners. Same Node PID **44941** held both ports at verification; no listeners8789/8790.
- CALLBACK_PORT/EVENTS_PORT configuration restored (defaults8787/8788); experimental SERVER_PORT ignored. Root env example, scripts, feature README, architecture and repo Zoom reference updated. Root `.env` not modified.

## Verification

- Two-listener isolation regression was observed failing before implementation, then passed.
- **60 root node tests,3 root Playwright tests,19 live node tests,3 live Playwright tests passed.**
- Parent independently ran isolated fixture on18787/18788, opened history/live in managed Chromium, observed synthetic live speaker/text and confirmed both private pages200. Independent raw HTTP: public private paths404; forwarded private paths403; both signed public CRCs200.
- Checked production unfinished activity count0 before restart. Stopped only owned main service and verified temporary bridge PID39688, then restarted existing root LaunchAgent. No Pi/transcript-processing test, actual recording download, vault change or cloud deletion invoked. Synthetic endpoint-validation probes only.
- Actual deployment verification, without displaying tokens or transcript contents:
  - Local8788 /events,/live,/api/events,/api/live/stream: **200**.
  - Forwarded/nonlocal-Host requests to8788 for those same routes: **403**.
  - Local8787 and real public hostname requests for those private routes: **404**.
  - Real public signed /zoom/transcripts and /zoom/rtms validation: **200**, HMAC responses verified.
  - Real public /zoom/oauth without a code: **400**, confirming callback route present without altering authorization.
- No Cloudflare settings changed. No credits purchased. No remote push.

## Operation

- History: http://127.0.0.1:8788/events
- Live: http://127.0.0.1:8788/live
- Inspect: `launchctl print "gui/$(id -u)/com.rookkeeper.zoom-transcript-callback"`.
- Restart only after recording jobs finish; shared process restart clears in-memory live text.
- Feature setup: [live README](../../../live/README.md).

## Scope and history

The earlier single-port attempt temporarily required8787→8788 forwarding because the actual tunnel origin differed from the user's initial assumption. That attempt is superseded. The temporary process was stopped and its script/log removed; final deployment uses the original architecture with new RTMS mounts and stronger private guards. Artifact directory keeps its initial dispatch name per task policy.

**Routing task complete.** Actual Zoom live transcription remains the separate live-feature activation gate: confirm Zoom subscription saved/validated, entitlement and host auto-start, then operate a private non-recorded test meeting. No actual live Zoom stream is claimed by this routing verification.
