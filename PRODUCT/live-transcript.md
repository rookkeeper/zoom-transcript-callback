# Live hosted-meeting transcript

Open a private local page while hosting a Zoom meeting and see incoming RTMS transcription. Speaker names and text share consistent colors; text can be selected/copied. Selection, upward scroll or a button pauses auto-scroll; resume returns to live text. Waiting, live, paused, reconnecting, disconnected and ended states explain recovery without promising recoverable historical gaps.

There is no transcript saving. Browser refresh gets retained in-memory text; new meeting/process restart clears it. Explicit Clear affects all viewers. Bounded retention discards older text visibly. This slice serves one hosted meeting at a time, not remote sharing or simultaneous-meeting history. Account entitlement, credits, authorization and Zoom auto-start govern availability; the local page doesn't start RTMS.

The live core is independent of recording harvesting, Pi, Peeps and event history. Both mini-apps share composition/routing and process lifecycle. The original public8787/local8788 layout is retained: RTMS joins the public Zoom endpoints, both UIs stay on8788. No Cloudflare change; code also blocks forwarded/nonlocal private access. See [operation/setup](../live/README.md) and [architecture](../ARCHITECTURE/live-transcript.md). Live Zoom activation still requires a private test meeting; synthetic QA does not establish it.
