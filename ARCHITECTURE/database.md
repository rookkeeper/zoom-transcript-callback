# Database

SQLite stores activity history at `data/events.sqlite` (override: `EVENTS_DATABASE_PATH`). Runtime data is excluded from Git. Node's built-in `node:sqlite` driver supplies synchronous, short transactions.

## Schema: `activities`, version 1

| Column | Type | Meaning |
|---|---|---|
| id | TEXT primary key | UUID for this callback attempt |
| endpoint, type, title | TEXT required | Receiving route, callback kind, display title |
| receivedAt | TEXT required | Receipt time, UTC ISO 8601 |
| startedAt, endedAt | TEXT nullable | Processing boundaries, UTC ISO 8601 |
| status | TEXT constrained | received, running, succeeded, failed, incomplete |
| error | TEXT nullable | Safe outcome reason |
| metadata | TEXT, valid JSON | Selected callback fields and processing results |

Indexes cover newest-first ordering and endpoint/status filtering. `PRAGMA user_version` tracks schema version; newer unknown versions are rejected. WAL mode and a five-second busy timeout support short writes. The database file is owner-readable/writable only.

## Initialization layer: `src/database.mjs`

`openDatabase(path: string) -> DatabaseSync`: creates the directory, opens SQLite, checks the version, creates schema/indexes, and sets permissions. Throws on unsupported versions or storage failures.

## Repository layer: `src/repository.mjs`

| Interface | Result | Purpose |
|---|---|---|
| `new ActivityRepository(path)` | repository | Opens storage |
| `save(activity)` | void | Inserts or updates a record; preserves receipt time |
| `get(id)` | activity or null | Decodes metadata for one record |
| `list({endpoint?, status?, limit=50, offset=0})` | activity[] | Exact filters, newest first, maximum 100 rows |
| `unfinished()` | activity[] | All received/running rows, without pagination |
| `close()` | void | Closes the connection |

SQL stays here. Services receive ordinary objects. Back up a stopped database, or use SQLite's online backup mechanism; copying only the main file while WAL writes are active is unsafe. No historical log import or automatic retention deletion.
