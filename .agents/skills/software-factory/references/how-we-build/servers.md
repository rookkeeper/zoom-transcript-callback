# Server applications

Starting guidance; adapt to the codebase and its product/architecture decisions.

- Keep transport/API handling, application/service logic, persistence/repositories, and datastore concerns behind clear interfaces where those boundaries improve cohesion and testability.
- Make business behavior testable without requiring a live external system; add focused integration tests at meaningful boundaries.
- Define local run, test, migration, seed/mock-data, and health-check commands. Make logs useful for diagnosing requests and failures without exposing secrets or sensitive data.
- For QA, operate the running service through its real API/entry point and verify observable behavior, authorization, persistence, and error cases relevant to the task.
