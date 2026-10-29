# Server

Request flow: HTTP adapter → activity service → repository → SQLite. Pi execution is a service collaborator. Startup composes these pieces; they can be replaced with doubles in tests.

## Composition and configuration

| Module / interface | Inputs → result | Responsibility |
|---|---|---|
| `config.loadConfig()` | environment → config | Ports, paths, limits, Zoom secret, Pi settings and prompt |
| `zoomPrompt.ZOOM_TRANSCRIPT_PROMPT` | template string | Internal Zoom transcript-processing instructions |
| `application.createApplication(config, service, processor, {live})` | dependencies → `{server, close}` | One unbound HTTP server, public allowlist/private mini-app mounts |
| `index.mjs` | config → running process | Opens storage, recovers interrupted work, listens, drains jobs on ordinary shutdown |

## HTTP/API layer

| Module / interface | Inputs → result | Responsibility |
|---|---|---|
| `callback.callbackHandler(config, activities, processor)` | dependencies → async HTTP handler | POST `/zoom/transcripts`: receipt, signature/body validation, selected Zoom metadata, immediate acknowledgment |
| `api.activityApi(service, url)` | service + URL → `{status, body}` | GET `/api/events` and `/api/events/:id`; validates pagination/status |
| `admin.adminHandler(service)` | service → HTTP handler | History mini-app; shared local-access guard. `adminServer` is a test-fixture wrapper only |

One listener defaults to loopback **8788** (`SERVER_PORT`; legacy CALLBACK_PORT/EVENTS_PORT ignored). Public allowlist: POST /zoom/transcripts, GET /zoom/oauth, POST /zoom/rtms. Private history/live routes and assets require `routing/localAccess.mjs`: loopback peer, exact local Host, no forwarded/Cloudflare hints, matching Origin/site. Deny before dispatch; unknown routes 404. Peer alone is insufficient because the tunnel connects locally. `src/index.mjs` composes independent recording and live cores and shuts down live sockets/SSE while accepted recording jobs drain. List query: `endpoint`, `status`, `limit` (1–100), `offset` (nonnegative integer). List response: `{items, limit, offset}`. Detail returns one activity. Invalid queries return 400; missing IDs return 404; storage failures return a generic 500 from the history API.

## Service layer: `activities.ActivityService(repository)`

| Function | Inputs → result | Responsibility |
|---|---|---|
| `receive({id?, endpoint, type?, title?, metadata?})` | callback facts → activity | Records receipt; removes credential-like metadata keys recursively |
| `update(id, fields)` | active ID + changes → activity | Enriches active records |
| `start(id)` | received ID → activity | Sets running and processing start time; rejects repeat starts |
| `finish(id, status, metadata?, error?)` | active ID + terminal result → activity | Sets end time and outcome; rejects terminal rewrites |
| `run(id, processor)` | ID + async zero-argument function → Promise<activity> | Starts work and persists its result or a safe failure |
| `recover()` | none → void | Marks abandoned received/running records incomplete on startup |
| `get(id)`, `list(query)` | ID or filters → activity/null or activity[] | Delegates reads |

Receipt can finish without processing (validation, rejection, unsupported event). Processing follows received → running → succeeded/failed/incomplete. No automatic replay or deduplication: each delivery is a separate attempt.

## Pi and Zoom adapters

`meetingJob.createMeetingJob(config) -> processMeeting(meetingUuid, requestId?)`: one meeting instance in, everything out. It fetches the recording index for the UUID (double-encoded in the Zoom API path: `encodeURIComponent(encodeURIComponent(uuid))`) across Zoom's two asset collections (`recording_files` and `participant_audio_files`), downloads the transcript first, starts the Pi agent as soon as it lands, downloads the remaining assets in parallel with three workers, verifies every asset locally, and then deletes the whole instance from Zoom by UUID — never per-file deletion. The numeric meeting ID rides along in metadata for display/linking only. Same-named local folders disambiguate by instance (`<date> <topic>`, `<date> <topic> 2`, …) via a `.zoom-meeting-uuid` marker file. Whole-meeting deletion is eventually consistent, so the delete step polls until the meeting endpoint 404s. Downloads use `.part` files with atomic promotion and bounded backoff; reuse requires matching the API size, not merely a nonempty file.

`processor.createProcessor(config, {spawn?, kill?}?) -> (details, requestId, assets?) -> Promise<{status, error, metadata}>`: creates a private working directory, renders the prompt with supplied local assets, starts Pi, logs output, enforces timeout, and checks the completion marker. Only a valid completed marker after exit zero writes the append-only success ledger. Metadata includes summary and optional structured `notePaths`. Timeouts fail even if termination is slow.

`pi.mjs`: `loadPiSkills(root,repoSkillDirectory) -> paths[]`; `piArgs({model,skills,title,prompt}) -> string[]`; `jobDirectory(root,id) -> path`; `appendJsonLine(path,entry) -> void`; `readCompletionMarker(directory) -> object|null`; `redactPiOutput(text,token) -> string`.

`zoom.mjs`: `zoomSignature(secret,timestamp,body) -> string`; `verifyZoomSignature({secret,timestamp,signature,rawBody,nowSeconds?,maxAgeSeconds?}) -> boolean`; `validationResponse(secret,token) -> object`; `transcriptDetails(payload) -> meeting metadata, meeting UUID, and numeric meeting ID`. `zoomDownloads.mjs` retrieves all completed assets for one UUID through the Zoom API (`encodeMeetingKey`/`meetingRecordingsPath` double-encode the UUID; `resolveInstanceDirectory` claims or increments the local folder) and writes them to the standard meeting folder.

For another callback: add an HTTP route with its own verification and deliberate metadata mapping; call `receive/update/run` with its endpoint, type, title and processor. The repository, history API, and UI need no type-specific change.
