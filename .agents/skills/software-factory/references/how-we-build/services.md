# Background and distributed services

Starting guidance; adapt to the actual service and deployment model.

- Identify service boundaries, message/API contracts, ownership of persisted data, retries, idempotency, and failure behavior in `ARCHITECTURE/`.
- Test pure logic, contract boundaries, and representative integration paths. Use controlled fixtures or local dependencies where possible; do not mistake mocks for end-to-end evidence.
- Document local startup, health/status inspection, queue/job inspection, and test-data setup.
- Independently verify observable service behavior, including relevant asynchronous completion, retries, and failure reporting. Avoid exposing credentials or production data in logs/artifacts.
