# Personal+ (Dielly OS)

Personal+ is a personal and family "operating system" that centralizes life, family,
work, career, English, studies, finances, church, hobbies, travel, decisions, pains,
automation opportunities, and cross-module intelligence in a single local-first web
application.

This is a **first complete, functional, persistent version** — every module listed in
the product spec is implemented with real CRUD, real IndexedDB persistence, real
permission checks, and real (rule-based) intelligence. Nothing is a placeholder screen.

## Purpose

Turn `DATA → CONTEXT → ANALYSIS → PRIORITY → ACTION → FOLLOW-UP → LEARNING` into a
single daily-usable tool, answering questions like "what actually matters today?",
"am I spending enough time with family?", "is my English improving?", "can I afford
this trip?", "what should I automate?".

## Requirements

- Any modern browser with IndexedDB support (Chrome, Edge, Firefox, Safari).
- No Node.js, build step, or package manager required to run the app.
- A tiny local HTTP server (ES modules must be served over `http://`, not `file://`).

## Installation & Running

No build step. Clone/download the repository, then serve the folder with any static
file server, for example:

```bash
# Option A — Python (already on most systems)
python3 -m http.server 8000

# Option B — Node (if you have it)
npx http-server -p 8000

# Option C — any other static file server
```

Then open `http://localhost:8000` in your browser.

> Opening `index.html` directly via `file://` will NOT work — browsers block ES module
> imports and IndexedDB origin rules under the `file://` scheme. Always use a local
> HTTP server.

## Demo users

The app seeds two accounts (and a full demo dataset) on first run:

| Username | Password    | Role          | Notes                             |
|----------|-------------|---------------|------------------------------------|
| `dielly` | `dielly123` | `OWNER`       | Full access to every module + Owner/Admin areas |
| `esposa` | `esposa123` | `FAMILY_ADMIN`| Family-scoped access, no Jobs/Admin/Owner |

Passwords are never stored in plain text (PBKDF2-SHA256 + salt via Web Crypto).

## Project structure

```
index.html              App shell (login screen + sidebar/header/content mount points)
css/styles.css           Design system (light/dark, responsive)
js/
  app.js                 Bootstrap: seeding, session restore, router wiring
  core/                   Data layer, services, connectors, AI engine (no DOM code)
    db.js                 IndexedDB schema + low-level CRUD
    dataProvider.js        DataProvider interface (swap seam for Supabase)
    indexedDbProvider.js    IndexedDB implementation of DataProvider
    repository.js           BaseRepository (common fields, soft delete, stamps)
    entityRepository.js      EntityRepository (polymorphic `records` store scoping)
    entities/               Dedicated repositories: users, tasks, notifications, audit, settings, connectors
    auth.js, permissions.js, audit.js, session.js
    moduleRegistry.js, router.js, moduleManager.js
    tasks.js, notifications.js, backupService.js, exportImportService.js, importUtils.js
    ai/                     AIProvider interface, MockAIProvider, Chief of Staff, Cross-Module Insights
    connectors/              Connector interface + Acompanha+/Expansão/Pluma/Corporate/JobSource connectors
    seed/                    Demo data seeders (one per module, auto-registered)
  ui/                      Framework-free DOM helpers + shared components (table, form, modal, kanban, tabs, chart)
  modules/                 One file per navigable module (UI + local seed data)
docs/                     Architecture, database, modules, permissions, connectors,
                           migration, backup/restore, AI architecture, security, dev guide
IMPLEMENTATION_STATUS.md  Module-by-module status table
FINAL_REPORT.md           Build summary, timestamps, testing notes
```

## Architecture at a glance

```
UI (js/modules, js/ui)
  -> Services (js/core/*.js — tasks, notifications, backup, AI, connectors)
    -> Repositories (js/core/repository.js, entityRepository.js, entities/*)
      -> DataProvider (js/core/dataProvider.js interface)
        -> IndexedDbProvider (today) — swappable for a SupabaseProvider later
```

No module ever touches IndexedDB directly — see `docs/ARCHITECTURE.md`.

## Backup, import & export

- **Backup & Restore** (Admin → Backup & Restore): full JSON export/import of every
  store, with MERGE or REPLACE restore modes and validation.
- **Import Center** (Admin → Import Center): connector-based (demo dataset or file
  upload) and generic per-entity-type JSON/CSV import with duplicate detection.
- **Export Center** (Admin → Export Center): export everything or a single module, as
  JSON or CSV.

## Testing

Open **Admin → Test Runner** in the app and click "Executar todos os testes" to run
in-browser checks covering repositories, permissions, visibility, backup/restore,
connector import/dedupe, and cross-module insight rules.

## Development

See `docs/DEVELOPMENT.md` for conventions, how to add a new module, and how the
generic entity CRUD engine works. See `docs/MIGRATION_TO_SUPABASE.md` for the planned
path from IndexedDB to Supabase/PostgreSQL.

## License

Apache 2.0 — see `LICENSE`.
