# UI

A small browser application with separate routing, HTTP client, state, and rendering modules. No framework or build step. The UI knows the shared activity contract, not Zoom or Pi rules.

| Layer / module | Interface | Purpose |
|---|---|---|
| Routes: `ui/routes.mjs` | `route(path) -> {id: string|null}|null` | `/events` (also `/`) lists history; `/events/:id` selects one activity; invalid paths return null |
| API client: `ui/client.mjs` | `apiClient(fetcher=fetch) -> {list(query), detail(id)}` | Methods return promises of API JSON and reject non-2xx responses |
| View state: `ui/state.mjs` | `createState(client) -> {value, load(query)}` | Tracks items/loading/error; `load` returns a promise and ignores stale responses |
| Components: `ui/components.mjs` | `render({items?, loading?, error?}) -> HTML string` | Escaped table, statuses, empty/error/loading messages, expandable YAML-style metadata |
| Exports: `ui/model.mjs` | Re-exports the above | Stable import surface |
| Controller: `ui/app.mjs` | DOM/history events → state + rendered page | Connects modules, filters, pagination, five-second refresh and per-route expanded rows |
| Shell/style | `ui/index.html`, `ui/style.css` | Accessible controls, document structure and layout |

Each row shows title, endpoint, receipt/start/end times, and status. Clicking the title opens a shareable local detail URL. Browser back/forward restores the route; query parameters retain filters and page offset. Metadata values are escaped before insertion into HTML.

Unit tests inject a fetcher/client. Playwright drives the real shell against an isolated server with 55 synthetic activities, multiple callback types, nested metadata, and every status. No model calls or Peeps writes occur in tests.
