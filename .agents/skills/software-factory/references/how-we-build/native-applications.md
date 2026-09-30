# Native applications

Starting guidance; adapt to the target operating system, toolkit, and project.

- Identify UI/module boundaries, state ownership, persistence, and platform-specific behavior in `ARCHITECTURE/`.
- Keep accessibility semantics usable for assistive technology and automation. On Apple platforms, consider stable accessibility identifiers for interactive controls; add equivalent platform affordances elsewhere.
- Document build, launch, test-data, and UI-verification steps, including required OS permissions. Automate interaction through accessibility/OS scripting when reliable; use keyboard interaction for controls the accessibility API cannot expose.
- Capture the application window for visual review rather than the full desktop when appropriate. Verify automation by querying the resulting UI state, not by assuming an action succeeded. Avoid stealing the user's focus; use a separate test environment when possible.
