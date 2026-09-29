# <Domain> integration

> **Path reminder:** paths in this reference are relative to the repo root (`.../zoom-transcript-callback/`).

Use this reference for work involving the `<domain>` integration. Keep durable, non-secret facts here so the agent can operate the integration without rediscovering its setup each time.

## General facts

<!--
Keep stable facts and reminders here:
- canonical provider/app URLs;
- local and public service URLs;
- account, app, calendar, or project identifiers that are safe to record;
- important reminders and decisions for future work.
Never put passwords, client secrets, webhook secrets, bearer tokens, or refresh tokens here.
-->

- **Provider/app location:** `<URL or navigation path>`
- **Important URLs:**
  - `<name>`: `<URL>`
- **Reminders:** `<durable fact or decision>`

## Setup and configuration

<!--
Document how the integration is configured:
- app/integration type;
- credentials and secret locations, without recording secret values;
- scopes, permissions, redirects, endpoints, and required setup;
- environment variables and the files that define them.
-->

- **Integration type:** `<type>`
- **Credentials:** `<where credentials are configured; never include secret values>`
- **Required setup:** `<setup steps>`

## Standard operating protocol

<!--
Put user-invocable operations here. When adding an operation, document:
- what the user can ask the agent to do;
- required inputs;
- command, script, API, or UI path;
- destructive-action confirmation requirements;
- expected result and where evidence is recorded.
-->

### <Operation name>

- **User request:** `<examples of how the user may ask for this>`
- **Inputs:** `<required IDs, dates, files, or options>`
- **Procedure:** `<commands or steps>`
- **Safety:** `<confirmation, dry-run, or least-privilege requirements>`
- **Result:** `<output and evidence location>`

## Callbacks

<!--
Document inbound webhook/callback behavior:
- event names and endpoints;
- verification and acknowledgement behavior;
- asynchronous processing;
- downstream skills or integrations that must be used;
- completion markers and failure/retry behavior.
If there are no callbacks, say so explicitly.
-->

### <Callback event>

- **Event and endpoint:** `<event>` at `<endpoint>`
- **Verification/acknowledgement:** `<how the request is verified and acknowledged>`
- **Processing:** `<what happens after acknowledgement>`
- **Downstream skill:** `<skill to use, or none>`
- **Completion/retry:** `<success marker, retry, and failure behavior>`

## Scheduled events

<!--
If no scheduled events exist, say so explicitly. For each future scheduled event, document:
- schedule and timezone;
- trigger and inputs;
- operation or callback it invokes;
- expected output;
- failure, retry, and notification behavior.
-->

No scheduled events are configured for this domain.

### <Scheduled event name>

- **Schedule/timezone:** `<placeholder>`
- **Trigger and inputs:** `<placeholder>`
- **Action:** `<placeholder>`
- **Output and notification:** `<placeholder>`
- **Failure/retry:** `<placeholder>`

## Diagnostics and troubleshooting

<!--
Document the fastest evidence path, logs, status pages, common failures, and recovery procedures.
-->

- **Primary status/evidence:** `<status page, database, or command>`
- **Logs:** `<paths or commands>`
- **Common failures:** `<symptom → diagnosis → recovery>`
