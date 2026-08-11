# Version

**Current version: `1.1.0`** — released 2026-08-11

## Versioning policy

Personal+ follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **MAJOR** — breaking changes to the data schema (`entityType` shape,
  `DataProvider` interface, backup file format) that require a migration step.
- **MINOR** — new modules, new connectors, new intelligence rules, or any
  backward-compatible feature addition.
- **PATCH** — bug fixes, documentation, and internal refactors with no user-facing
  behavior change.

The version number is tracked here and in `CHANGELOG.md`; there is no build step or
`package.json`, so this file is the single source of truth for "what version is this
checkout."

## Schema version vs. app version

Don't confuse this with `SCHEMA_VERSION` in `js/core/db.js` (currently `1`), which
versions the **IndexedDB schema** specifically (stores/indexes) and drives
`onupgradeneeded` migrations. The app version above can advance (new features, fixes)
without the schema version changing, and vice versa. See `docs/DATABASE.md`.

## Release history

| Version | Date | Highlights |
|---|---|---|
| `1.1.0` | 2026-08-11 | Mobile sidebar (off-canvas menu + hamburger toggle), Load/Delete demo data in Backup & Restore, new central Dashboards module. See `CHANGELOG.md`. |
| `1.0.0` | 2026-08-11 | First complete, functional, persistent release — every module in the product spec implemented (Command Center through Owner/Admin), 5 connectors, rule-based AI layer, full RBAC + visibility, backup/restore, in-app test suite. See `CHANGELOG.md` for the full list. |

## What's next (not yet scheduled)

Documented as architectural seams, not commitments: a real LLM-backed `AIProvider`
(`docs/AI_ARCHITECTURE.md`), live connector APIs (`docs/CONNECTORS.md`), and the
Supabase migration (`docs/MIGRATION_TO_SUPABASE.md`).
