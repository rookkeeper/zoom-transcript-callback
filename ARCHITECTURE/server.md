# Server

Request flow: HTTP adapter → activity service → repository → SQLite. Pi execution is a service collaborator. Startup composes these pieces; they can be replaced with doubles in tests.

## Composition and configuration

| Module / interface | Inputs → result | Responsibility |
|---|---|---|
| `config.loadConfig()` | environment → config | Ports, paths, limits, Zoom secret, Pi settings and prompt |
| `config.readPromptFile(path)` | path → string | Loads prompt without documentation comments |
| `application.createApplication(config, service, processor)` | dependencies → `{callback, admin}` HTTP servers | Creates unbound, separately testable listeners |
| `index.mjs` | config → running process | Opens storage, recovers interrupted work, listens, drains jobs on ordinary shutdown |

## HTTP/API layer

| Module / interface | Inputs → result | Responsibility |
|---|---|---|
| `callback.callbackHandler(config, activities, processor)` | dependencies → async HTTP handler | POST `/zoom/transcripts`: receipt, signature/body validation, selected Zoom metadata, immediate acknowledgment |
| `api.activityApi(service, url)` | service + URL → `{status, body}` | GET `/api/events` and `/api/events/:id`; validates pagination/status |
| `admin.adminServer(service)` | service → HTTP server | Serves API and UI on loopback; exact local Host, rejects forwarding headers |

Public callback port defaults to 8787; local history port defaults to 8788. The public listener has no history routes. List query: `endpoint`, `status`, `limit` (1–100), `offset` (nonnegative integer). List response: `{items, limit, offset}`. Detail returns one activity. Invalid queries return 400; missing IDs return 404; storage failures return a generic 500 from the history API.

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

`processor.createProcessor(config, {spawn?, kill?}?) -> (details, requestId) -> Promise<{status, error, metadata}>`: creates a private working directory, renders the prompt, starts Pi, logs output, enforces timeout, and checks the completion marker. Only a valid completed marker after exit zero writes the append-only success ledger. Metadata includes summary and optional structured `notePaths`. Timeouts fail even if termination is slow.

`pi.mjs`: `loadPiSkills(root) -> paths[]`; `piArgs({model,skills,title,prompt}) -> string[]`; `jobDirectory(root,id) -> path`; `appendJsonLine(path,entry) -> void`; `readCompletionMarker(directory) -> object|null`; `redactPiOutput(text,token) -> string`.

`zoom.mjs`: `zoomSignature(secret,timestamp,body) -> string`; `verifyZoomSignature({secret,timestamp,signature,rawBody,nowSeconds?,maxAgeSeconds?}) -> boolean`; `validationResponse(secret,token) -> object`; `transcriptDetails(payload) -> selected fields`, including credentials used only by the processor.

For another callback: add an HTTP route with its own verification and deliberate metadata mapping; call `receive/update/run` with its endpoint, type, title and processor. The repository, history API, and UI need no type-specific change.
