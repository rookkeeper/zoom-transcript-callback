# Web frontends

Starting guidance; adapt to the framework and product.

- Keep rendering, user interaction, state transitions, and service access organized around understandable responsibilities and testable boundaries.
- Provide stable selectors or accessibility semantics for critical controls (prefer accessible labels/roles; add `data-testid` where needed for reliable automation).
- Document commands for starting the development server, loading representative data, running checks, and resetting test state.
- Independently exercise the running UI through realistic user paths; verify visible output and important state changes. Use scripted browser automation when available and suitable, and capture screenshots for meaningful layout/visual changes.
