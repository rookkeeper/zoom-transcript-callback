# Server events screen

Plan only. Wait for John's instruction before starting implementation. Track callbacks for Zoom and future integrations through distinct API, service, repository, and SQLite database layers.

## TDD requirement for every implementation group

Use test-driven development (TDD): write tests for the intended behavior, run them and demonstrate meaningful failures, implement the behavior, then run the same tests and demonstrate success. Refactor only while keeping the tests green. Record red and green evidence for each layer; missing dependencies or broken test setup do not count as the required behavioral failure.

- [ ] **TDD setup**: Establish the test commands and isolated fixtures for database/repository, service, API, UI, and integration tests before implementing their behavior.
- [ ] **TDD evidence**: Record the failing test names and reasons followed by the passing results for each implementation slice. Do not implement a layer first and add its tests afterward.

## 1. Define the activity contract

Establish a shared record and lifecycle that supports multiple endpoints without requiring callback-specific UI code.

- [ ] **Common fields**: Define activity ID, callback type, receiving endpoint, title, received timestamp, processing start timestamp, processing end timestamp, status, optional error description, and arbitrary structured metadata.
- [ ] **Lifecycle rules**: Define received, running, succeeded, failed, and incomplete states and their allowed transitions. Distinguish active processing from processing that stopped without completing; record timeout reasons explicitly.
- [ ] **Callback mapping**: Specify how each handler supplies its title, callback type, endpoint, and metadata. Capture Zoom's meeting title when the validated payload is parsed, before Pi starts.
- [ ] **Metadata boundaries**: Store metadata as JSON and render it as a YAML-style detail list. Exclude credentials, authorization headers, and temporary download tokens; allow only deliberately selected callback metadata.
- [ ] **Scope boundaries**: Include durable activity history and interrupted-run visibility. Exclude automatic retry, replay, historical log import, and a generic agent runner unless separately agreed.

## 2. Persist activities in SQLite

Create the database schema and a repository interface that hides SQL from the service and API layers.

- [ ] **Red database and repository tests**: Write and run failing tests against temporary SQLite databases for schema creation, persistence across reopen, metadata round trips, lifecycle updates, and list/detail queries. Record the failure evidence before implementation.
- [ ] **Schema and initialization**: Add versioned schema initialization, required field constraints, and indexes for newest-first activity listings and endpoint/status filtering.
- [ ] **Repository implementation**: Implement activity creation, updates, lookup by ID, and bounded paginated queries behind a repository interface. Preserve received records when later processing fails.
- [ ] **Green database and repository tests**: Run the original tests to demonstrate they pass, including storage errors and invalid updates. Record the passing evidence.

## 3. Coordinate callback processing in the service layer

Make the service responsible for recording activity and processing outcomes, independently of HTTP and SQLite details.

- [ ] **Red service tests**: Use controlled repository and processor doubles to demonstrate failures for receipt, start, success, spawn errors, timeouts, missing completion markers, and interrupted processing before implementing these behaviors.
- [ ] **Activity service**: Implement lifecycle coordination and callback metadata updates through the repository interface. Keep HTTP request handling and SQL out of this layer.
- [ ] **Zoom integration**: Adapt the existing Zoom/Pi workflow to record meeting title, receiving endpoint, meeting and recording IDs, model, outcome summary, and available note paths. Preserve signature validation, prompt behavior, and the existing success ledger.
- [ ] **Completion semantics**: Mark success only after the required processing completion evidence exists. Store errors and incomplete outcomes explicitly; treat note paths as structured fields when supplied rather than extracting them from prose.
- [ ] **Restart handling**: Define and implement how previously active jobs become incomplete when the server cannot establish their outcome after restart. Do not silently rerun jobs or leave abandoned work displayed as running forever.
- [ ] **Green service tests**: Demonstrate that the original service tests pass and that failure recording does not incorrectly produce a successful activity or success-ledger entry.

## 4. Expose the activity API

Keep callback HTTP handling and activity queries in the API layer, delegating application behavior to the service.

- [ ] **Red API tests**: Write and run failing request-level tests for activity lists, detail lookup, pagination, endpoint/status filters, unknown IDs, malformed input, and callback acceptance/rejection behavior.
- [ ] **List and detail endpoints**: Add JSON endpoints exposing common fields and arbitrary metadata through the service. Return consistent errors and bounded results without leaking database details.
- [ ] **Rejected callbacks**: Record rejected callback attempts using safe request facts and rejection reasons. Do not treat unvalidated payload titles or metadata as trusted activity data.
- [ ] **Ingress protection**: Keep the activity API and screen accessible locally without exposing private meeting information through the public callback tunnel. Test the actual ingress arrangement rather than assuming a loopback bind makes the page private.
- [ ] **Green API tests**: Run the original API tests successfully and verify callback acknowledgments remain prompt while processing continues asynchronously.

## 5. Build the events screen

Present a reusable callback activity list with common columns and expandable metadata for any callback type. Separate routing, API access, view state, and display components; keep SQL and callback-processing rules on the server.

- [ ] **UI boundaries**: Define a small API client for fetching activity data, view-state logic for filters/pagination/refresh, and display components for rows, statuses, and metadata. Inject API access in tests so display and state behavior can be tested without a running server.
- [ ] **Routing TDD**: Write failing tests for the activity-list route and an activity-detail URL, then implement routing and demonstrate passing tests. Support direct links, browser back/forward, and invalid activity IDs; choose route paths that do not conflict with callback endpoints.
- [ ] **API client TDD**: Write failing tests for request parameters, response handling, and API errors, then implement the client and show green results. Keep HTTP details out of display components.
- [ ] **View-state TDD**: Write failing tests for loading, filtering, pagination, refresh, stale responses, and expanded/selected activity state, then implement and show green results. Keep this logic separate from visual rendering.

- [ ] **Red UI tests**: Write and run failing tests for rows, endpoint display, timestamps, statuses, expandable metadata, empty history, loading, and API failures before implementing the screen.
- [ ] **Top-level display**: Show title, receiving endpoint, processing start time, processing end time, and status for each activity. Include received time so callbacks that never started processing remain understandable.
- [ ] **Metadata details**: Expand a row into a readable YAML-style list of arbitrary nested metadata, including errors and processing summaries. Escape all values so callback content cannot become executable HTML.
- [ ] **Navigation and refresh**: Provide newest-first ordering, endpoint/status filters, pagination, and automatic refresh that preserves the user's expanded rows and current view.
- [ ] **Green UI tests**: Demonstrate the original UI tests pass and inspect the screen with multiple callback types, long titles, nested metadata, and all supported statuses.
- [ ] **Browser-flow TDD**: Write a failing browser test for opening the list, viewing activity details, and navigating back, then complete the wiring and show the test passing. Use controlled API responses for repeatability.

## 6. Validate integration and document operation

Prove the layers work together and document how to operate the system and add future callbacks.

- [ ] **Red integration tests**: Demonstrate failing end-to-end tests for a signed callback producing a stored activity, controlled successful and failed processing, restart visibility, and retrieval through the API.
- [ ] **Green integration tests**: Run the complete pipeline with a controlled processor and temporary database, proving success, failure, incomplete outcomes, and endpoint-specific metadata without editing real Peeps notes.
- [ ] **Operational documentation**: Document database location, schema upgrades, backup expectations, log/ledger relationships, local access, and the steps for registering another callback type.
- [ ] **Final review**: Review layer boundaries, secret handling, test red/green evidence, and the final diff. Report any remaining limits and do not claim a live Zoom/Pi test occurred unless one was actually run.
- [ ] **Deployment handoff**: Prepare and describe activation and restart steps, including handling active jobs. Coordinate activation after validation and report the resulting server state.
