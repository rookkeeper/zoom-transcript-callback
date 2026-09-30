---
id: "server-events-screen"
title: "Server events screen"
status: complete
created: "2026-09-11"
touched: "2026-09-15"
tags: [ui, database, api]
---

# Server events screen

## Desired outcome

Track callbacks for Zoom and future integrations through distinct API, service, repository, and SQLite database layers, with a local history screen showing what ran, when, and whether it succeeded.

## Acceptance criteria

- [x] Activity contract with ID, callback type, endpoint, title, timestamps, status, error, and structured metadata.
- [x] Lifecycle states `received`, `running`, `succeeded`, `failed`, `incomplete` with enforced transitions.
- [x] SQLite persistence behind a repository interface that hides SQL from service and API layers.
- [x] Loopback-only history API and UI; public callback listener exposes no history routes.
- [x] Credentials, auth headers, and temporary tokens excluded from stored metadata.

## Planning artifacts

Completed artifacts: `TASKS/COMPLETE/server-events-screen/`

## Planning and implementation checklist

- [x] Implement and test each layer with recorded red/green evidence.
- [x] Validate integration, persistence, restart visibility, and ingress isolation.
- [x] Record outcome and evidence.

## Notes / activity

The one open item in the original checklist (`Red API tests`) was satisfied in practice — `test/api.test.mjs` exists and passes — but the box was never ticked during the original run. TDD evidence is in `outcome.md`.
