# Version

**Current version: `1.12.0`** — released 2026-08-12

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

## Live version display & stale-build warning

The running app shows its version next to "Dielly OS" (sidebar, once logged in) and
below it (login screen) — see `js/core/version.js`. Because this is a static site
with no build step or cache-busted asset URLs, a browser (or CDN) can keep serving an
old cached copy after a new version is deployed. `js/core/versionCheck.js` guards
against exactly that: on load, and every 5 minutes thereafter, it fetches
`/version.json` with `cache: 'no-store'` (a real network round-trip, bypassing HTTP
caching entirely) and compares it to the embedded `APP_VERSION`. A mismatch means the
JS actually running in the browser is older than what's deployed, and a persistent
banner appears (both on the login screen and the logged-in shell) with an "Atualizar
agora" button that forces a fresh navigation.

### Releasing a new version — checklist

All four of these must be updated together, in the same commit, or the live
stale-version warning will misfire:

1. `js/core/version.js` — bump `APP_VERSION`.
2. `version.json` — bump `"version"` to match.
3. `VERSION.md` — bump the "Current version" line and add a row to the release
   history table below.
4. `CHANGELOG.md` — add a dated entry under the new version.

## Schema version vs. app version

Don't confuse this with `SCHEMA_VERSION` in `js/core/db.js` (currently `1`), which
versions the **IndexedDB schema** specifically (stores/indexes) and drives
`onupgradeneeded` migrations. The app version above can advance (new features, fixes)
without the schema version changing, and vice versa. See `docs/DATABASE.md`.

## Release history

| Version | Date | Highlights |
|---|---|---|
| `1.12.0` | 2026-08-12 | English/Portuguese language toggle (login screen + header). Translates app chrome, the shared CRUD engine, and Command Center, Finance, Family, Church, and Dashboards in full — remaining modules still Portuguese-only, tracked as follow-up. See `CHANGELOG.md`. |
| `1.11.1` | 2026-08-11 | Clicking a notification now opens its module, not just marks it read. See `CHANGELOG.md`. |
| `1.11.0` | 2026-08-11 | Church gets a "Jovens (Expansão)" tab: import a full Portal Expansão backup and see a youth-ministry census — distribution by city/congregação/função/estado civil/pastor, water/Holy-Spirit baptism coverage with a follow-up list, and upcoming birthdays. Dashboards gets a matching card. See `CHANGELOG.md`. |
| `1.10.1` | 2026-08-11 | Fix: Acompanha+ School's trend-line section could crash if the browser had a torn/stale cache (some JS files updated, others not). Now degrades gracefully instead of throwing. See `CHANGELOG.md`. |
| `1.10.0` | 2026-08-11 | Acompanha+ School gets a line-chart trend view (overall score by bimester and by semester). Dashboards' event-log and grades cards are merged into one "Acompanha+ School" card so a child with only grade data (no logged events) still shows up. See `CHANGELOG.md`. |
| `1.9.1` | 2026-08-11 | Fix: Acompanha+ School had two confusingly similar import cards (easy to pick the wrong one, producing childless garbage records). Merged into a single import field that auto-detects the file format, plus a cleanup action for any garbage records already imported. See `CHANGELOG.md`. |
| `1.9.0` | 2026-08-11 | Acompanha+ School: import a full school-system backup and see bimester/semester grade evolution per child — radar + grouped-bar comparisons, per-category trend charts, combined categories/disciplinas chart, Regular/Bom/Ótimo percentages. Dashboards gets a matching per-child "Notas" comparison row. See `CHANGELOG.md`. |
| `1.8.0` | 2026-08-11 | New dedicated "Acompanha+ School" module (Life group) — browse, edit, and import Acompanha+ data directly, instead of only a widget buried in Family Hub. Also added to Dashboards. See `CHANGELOG.md`. |
| `1.7.1` | 2026-08-11 | Finance stat tiles (Dashboard tab, month detail, and the Dashboards module's Finance card) now color-code Receitas (green), Despesas (red), and Saldo (blue if positive, red if negative). See `CHANGELOG.md`. |
| `1.7.0` | 2026-08-11 | Finance: full-year monthly income/expense chart with click-to-drill-down; Dashboards' Finance card now shows the current month and opens Finance on click. Import Center: preview/confirm buttons show live progress instead of appearing frozen on large files. See `CHANGELOG.md`. |
| `1.6.1` | 2026-08-11 | Fix: JSON import silently mis-parsed files wrapped in an unrecognized key (e.g. `{ transactions: [...] }`), treating the whole file as one bad record. See `CHANGELOG.md`. |
| `1.6.0` | 2026-08-11 | Import Center: each connector card (Acompanha+, Portal Expansão, Pluma, Job Sources) now has its own file upload + mapped preview + confirm, not just the demo-dataset button. See `CHANGELOG.md`. |
| `1.5.0` | 2026-08-11 | Version shown in the UI (login screen + sidebar) and an automatic stale-build warning banner (`version.json` + no-store fetch check). See `CHANGELOG.md`. |
| `1.4.0` | 2026-08-11 | Custom roles: create new roles in User Management, configure their per-module access in Permission Manager. Role defaults are now data-driven instead of hardcoded. See `CHANGELOG.md`. |
| `1.3.0` | 2026-08-11 | Global Calendar: real month-grid view with color-coded categories (was list-only). See `CHANGELOG.md`. |
| `1.2.0` | 2026-08-11 | "Apagar dados de todos os módulos" bulk-clear button in Data Management. See `CHANGELOG.md`. |
| `1.1.0` | 2026-08-11 | Mobile sidebar (off-canvas menu + hamburger toggle), Load/Delete demo data in Backup & Restore, new central Dashboards module. See `CHANGELOG.md`. |
| `1.0.0` | 2026-08-11 | First complete, functional, persistent release — every module in the product spec implemented (Command Center through Owner/Admin), 5 connectors, rule-based AI layer, full RBAC + visibility, backup/restore, in-app test suite. See `CHANGELOG.md` for the full list. |

## What's next (not yet scheduled)

Documented as architectural seams, not commitments: a real LLM-backed `AIProvider`
(`docs/AI_ARCHITECTURE.md`), live connector APIs (`docs/CONNECTORS.md`), and the
Supabase migration (`docs/MIGRATION_TO_SUPABASE.md`).
