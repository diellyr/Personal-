# Changelog

All notable changes to this project are documented in this file. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows
[Semantic Versioning](https://semver.org/) — see `VERSION.md`.

## [Unreleased]

Nothing yet.

## [1.7.1] — 2026-08-11

### Changed

- **Color-coded finance stat tiles.** Receitas is now green, Despesas is red,
  and Saldo is blue when positive / red when negative — applied consistently
  in the Finance module's Dashboard tab (top summary and the monthly
  drill-down detail) and the central Dashboards module's Finance card.
  `statTile()` (`js/ui/components/misc.js`) gained an optional 4th `tone`
  argument (`'success' | 'critical' | 'info'`) mapped to new
  `.stat-value-success/-critical/-info` classes in `css/styles.css`, reusing
  the same success/critical/info palette (and dark-mode variants) already
  used by badges.

## [1.7.0] — 2026-08-11

### Added

- **Finance: full-year monthly income/expense view.** The Finance dashboard
  tab now shows two 12-bar charts (Jan–Dez) — receitas and despesas per month
  for the current year — built from a new `computeMonthlyBreakdown()`
  (`js/core/financeIntelligence.js`). Clicking any bar (or its month label)
  shows that month's income/expense/balance totals plus the full list of
  transactions for the month, defaulting to the current month (or the most
  recent month with data) on load.
- **Dashboards: Finance card now shows the current month.** The central
  Dashboards module's Finance card (`js/modules/dashboardsModule.js`) shows
  current-month receitas/despesas/saldo stat tiles above the existing
  spending-by-category chart, and the whole card is now clickable (not just
  the "Abrir módulo" button) to jump straight into the Finance module.
- **Import Center: live progress on preview/confirm.** The "Pré-visualizar"
  and "Confirmar importação" buttons (both the generic importer and every
  per-connector card) now disable themselves and show a live counter
  (`Importando 1234/3266…`) while the import runs, instead of giving zero
  feedback. `BaseConnector.import()` and `importIntoEntityType()` accept an
  optional `onProgress(done, total)` callback, throttled in the UI layer to
  avoid repainting on every single record. Root cause: a multi-second import
  of thousands of records previously looked identical to a frozen page,
  which risked someone navigating away mid-import and ending up with a
  partial result.

### Changed

- `js/ui/components/chart.js`'s `barChart()` now accepts an optional
  `onClick` per data point (used by the new monthly finance view) and clamps
  bar height to `Math.abs(value)` so negative values don't produce a
  negative-height SVG rect.

## [1.6.1] — 2026-08-11

### Fixed

- **JSON import silently mis-parsed wrapped exports.** `parseJSON()`
  (`js/core/importUtils.js`) only recognized the record list under the keys
  `records`/`items`/`data`. A real Pluma export shaped like
  `{ exportedAt, totalTransactions, transactions: [...] }` used a key it didn't
  anticipate, so the entire wrapper object was treated as a single malformed
  record — every field came back empty/default (an amount of R$0,00, category
  "Outros", today's date), producing one bogus transaction instead of the 3,266
  real ones in the file. Fixed by widening the recognized key list and adding a
  fallback: when the object has exactly one array-valued property, use it
  regardless of its name — covers arbitrary wrapper shapes without needing to
  special-case every export format. Added a regression test to the in-app Test
  Runner (now 11/11) and re-verified end-to-end against the actual reported
  file: all 3,266 transactions imported with correct dates, descriptions,
  categories, and amounts.

If you hit this bug before upgrading: the bogus placeholder transaction (named
literally "Transação Pluma", R$ 0,00) can be removed with its row's "Excluir"
button in Finance → Transações, then re-import your file.

## [1.6.0] — 2026-08-11

### Added

- **Per-connector file import** (Admin → Import Center): each connector card
  (Acompanha+, Portal Expansão, Pluma, Job Sources) now has its own file input,
  "Pré-visualizar" (applies that connector's field mapping via `conn.preview()` and
  flags duplicates by `external_id`), and "Confirmar importação" — the same pattern
  Owner → Corporate Collector already used, now applied consistently everywhere a
  connector exists. Previously these cards only offered the bundled demo dataset;
  there was no way to import your own real export from Acompanha+/Expansão/Pluma/a
  job board with the connector's field-name mapping applied (the generic
  "any entity type" importer further down the page still exists for raw,
  unmapped imports). `js/modules/importExportCenter.js`.

Verified end-to-end with a real CSV using Pluma's Portuguese column names
(`descricao`/`valor`/`tipo`): preview correctly mapped fields and showed
"2 novo(s) · 0 duplicado(s)", confirming the import created correctly-mapped Finance
transactions; re-uploading the same file correctly showed "0 novo(s) · 2
duplicado(s)".

## [1.5.0] — 2026-08-11

### Added

- **Version display**: the running app's version now shows below "Dielly OS" on the
  login screen and next to it in the sidebar once logged in (`js/core/version.js`).
- **Stale-build warning**: a persistent banner (visible on both the login screen and
  the logged-in shell) appears whenever the JS actually running in the browser is
  older than what's deployed — checked on load and every 5 minutes via a
  `cache: 'no-store'` fetch of `/version.json`, so it can't be fooled by HTTP/CDN
  caching. Includes an "Atualizar agora" button that forces a fresh navigation.
  `js/core/versionCheck.js`. See "Live version display & stale-build warning" in
  `VERSION.md` for the release checklist this introduces (4 files must move together:
  `js/core/version.js`, `version.json`, `VERSION.md`, `CHANGELOG.md`).

### Investigated

- User reported the previous release (custom roles, v1.4.0) "didn't work." Confirmed
  via the GitHub Actions API that the `pages-build-deployment` workflow completed
  successfully for that exact commit — the deployment pipeline itself was healthy.
  Could not reach the live URL directly to see what the user saw (blocked by this
  environment's network egress policy). Most likely explanation: browser cache
  (especially on mobile) serving a pre-update copy, or checking before the ~1-2 minute
  deploy finished — which this release's version banner now makes self-diagnosing.

## [1.4.0] — 2026-08-11

### Added

- **Custom roles** (`js/core/roleService.js`): Admin → User Management now has a
  "Roles" section where the Owner can create additional roles beyond OWNER/
  FAMILY_ADMIN/MEMBER (e.g. "ACCOUNTANT", "GUEST"). New roles start with **no**
  access to any module (principle of least privilege) and appear immediately —
  no extra step needed — as a new column in Admin → Permission Manager's new
  **role × module × permission matrix**, where the Owner sets that role's
  default access per module. The "create user" form's role dropdown is now
  populated dynamically from all existing roles instead of a hardcoded list.
  Built-in roles cannot be deleted; custom roles can be deleted only while no
  user is assigned to them.

### Changed

- **Role permission defaults are now data-driven**, not a hardcoded JS object.
  `FAMILY_ADMIN` and `MEMBER`'s existing defaults were migrated 1:1 into the
  new storage on first boot (`ensureBuiltInRoles()`, idempotent, runs every
  boot independent of demo-data seeding) — verified via automated regression
  that the spouse account's access is byte-for-byte unchanged after the
  migration. `docs/PERMISSIONS.md` updated accordingly.

Two new tests added to the in-app Test Runner (now 10/10): custom role
creation + grant + apply-to-user round-trip, and built-in roles rejecting
deletion.

## [1.3.0] — 2026-08-11

### Added

- **Global Calendar month grid** (`js/modules/globalCalendar.js`): the module was
  list-only before — now it renders an actual month calendar (prev/next
  navigation, today highlighted, click any day to see its items below). Every
  category (Family, Church, Travel, Career, Interview, Health, Studies, Task)
  has a fixed, distinct color used consistently as the grid dots, the legend
  chips, and the list badges. A day cell shows one dot per distinct category
  present (not one per item, so a day with 6 tasks doesn't drown out the other
  categories) plus a total item count. Clicking a legend chip toggles that
  category everywhere (grid, selected-day panel, and the full list) at once.
  The existing chronological list is kept below the grid for a full overview.

### Fixed

- A class-name mismatch between the CSS (`.category-dot`) and the JS
  (`.calendar-dot`) meant the very first version of this grid rendered dots
  with a color but no size — caught immediately via automated screenshot
  comparison before shipping.

## [1.2.0] — 2026-08-11

### Added

- **"Apagar dados de todos os módulos"** (Admin → Data Management, Owner-only):
  bulk counterpart to the existing per-module "Limpar módulo" button — clears
  every entity type plus Tasks in one confirmed action, instead of clicking
  "Limpar módulo" once per module. Soft delete (recoverable via Backup &
  Restore), audit-logged, and explicitly does **not** touch users, settings,
  permission overrides, connector status, or the audit log itself.
  `js/core/dataManagementService.js`.
  Verified end-to-end that it clears both real and demo records across
  multiple modules while leaving accounts and system state intact — distinct
  from "Excluir dados demo" (1.1.0), which only ever removes seeded demo
  records and leaves real data untouched (also re-verified in this pass).

## [1.1.0] — 2026-08-11

Follow-up release addressing mobile-testing feedback and two feature gaps.

### Added

- **Central Dashboards module** (`#/dashboards`, `js/modules/dashboardsModule.js`):
  one screen aggregating charts already computed by each module's own
  Intelligence layer — Finance (spending by category + 12-month forecast), Work
  (timesheet by category), Career (evidence scores), English (competency radar),
  Life Balance (radar), Jobs (pipeline by stage), Church (ministry health). Each
  card is gated by the same module permission its full screen uses (e.g. the Jobs
  card is hidden for a user without `jobs` VIEW access), and links back to its
  module for the full drill-down. `js/core/lifeBalanceIntelligence.js` extracted
  from `lifeBalanceModule.js` so the radar math is shared instead of duplicated.
- **Load/Delete demo data** (Admin → Backup & Restore, Owner-only):
  - "Carregar dados demo" resets demo content to a clean, consistent set (deletes
    any existing demo data first, then re-runs every module's seeder) —
    idempotent, safe to click repeatedly.
  - "Excluir dados demo" permanently removes every record tagged as seeded demo
    data, leaving real user-entered data untouched.
  - New `js/core/seedContext.js` flag, consulted by `BaseRepository`,
    `notifications.js`, and `tasks.js`, auto-tags everything created during a
    seed pass with `source: 'DEMO_SEED'` — no per-seeder bookkeeping needed.
    Editing a demo record through its normal form re-stamps it with a real
    source, so it "graduates" out of demo data automatically.
  - New `js/core/demoDataService.js` (`deleteAllDemoData()`, `reseedDemoData()`).

### Fixed

- **Mobile: left sidebar didn't collapse.** The sidebar was always full-width
  with no toggle, unusable on phone-sized viewports. Added a hamburger button in
  the header (visible under 860px), an off-canvas sliding sidebar with a
  backdrop, auto-close on navigation, and close-on-backdrop-tap
  (`js/ui/layout/sidebarToggle.js`, CSS media query in `css/styles.css`).

## [1.0.0] — 2026-08-11

First complete, functional, persistent release of Personal+ (Dielly OS). Every module
in the product specification is implemented with real forms, real IndexedDB
persistence, real permission/visibility enforcement, and real (rule-based)
intelligence — no placeholder screens.

### Added

**Architecture & data layer**
- IndexedDB-backed data layer (`js/core/db.js`) behind a `DataProvider` interface,
  a `BaseRepository`/`EntityRepository` abstraction, and a single polymorphic
  `records` store covering ~35 entity types — documented as migration-ready for
  Supabase/PostgreSQL (`docs/MIGRATION_TO_SUPABASE.md`).
- Local authentication (PBKDF2-SHA256 salted password hashing), session management,
  and RBAC + per-record visibility (PRIVATE/FAMILY/CUSTOM) with a live Admin
  permission matrix.
- Config-driven generic Entity CRUD/Kanban engine (`entityModuleEngine.js`) powering
  ~30 of the modules below from field schemas.
- Central Task Engine, Notification Center, audit logging, error handling/toasts,
  hash router with module enable/disable support.

**Modules**
- Command Center (Today/Week/Month views, priorities, agenda, indicators).
- Family, Family Hub, Family Load indicator, Acompanha+ connector.
- Church + Church Intelligence (Attention Radar, Leadership Load, Ministry Health),
  Portal Expansão connector.
- Finance (dashboard, Spending Intelligence, Goal Manager, Forecast, Financial
  Decision Agent), Pluma connector.
- Hobbies & Lazer, Travel Planner + Trip Dashboard.
- Health (administrative tracking).
- Work Intelligence (Daily Brief, Weekly Review, Meeting ROI + Action Engine, Jira
  Intelligence, Timesheet), Corporate Collector + Sanitizer.
- Career Intelligence (Achievement Tracker, Evidence Engine, Drift Detector, Vault).
- Job Hunter (Kanban Pipeline, Job Match Engine/Fit Score, Application Agent, Salary
  Intelligence, Interview Manager), Job Source connector.
- English Intelligence (dashboard, Immersion sessions, Meeting/Interview Simulators,
  Weakness Engine, Shadow English), Studies & Skills, Skill Gap Radar.
- Personal CRM + Follow-up Engine, Decision Journal + Review, Pain Tracker + Pain
  Detector + Automation Opportunity Engine, Idea Backlog, Personal Memory, Life
  Balance Intelligence, Projects, Goals.
- Administration: User Management, Import Center, Export Center, Backup & Restore
  (+ staleness reminder), Module Manager, Permission Manager, Privacy Manager,
  Integration Center, Audit Log, Data Management, System Health, in-app Test Runner.
- Owner-only area: AI Settings, Corporate Collector.
- Global Search, Global Calendar, cross-module AI Chief of Staff and Cross-Module
  Insight Service.
- `AIProvider` interface + `MockAIProvider` (offline, zero-dependency rule engine)
  powering every "AI" feature; no API keys required or hardcoded.

**Documentation**
- `docs/ARCHITECTURE.md`, `DATABASE.md`, `MODULES.md`, `PERMISSIONS.md`,
  `CONNECTORS.md`, `MIGRATION_TO_SUPABASE.md`, `BACKUP_RESTORE.md`,
  `AI_ARCHITECTURE.md`, `SECURITY.md`, `DEVELOPMENT.md`, `USER_GUIDE.md`.
- `IMPLEMENTATION_STATUS.md` (per-module status table) and `FINAL_REPORT.md` (build
  summary, testing notes, timestamps).

### Fixed

Bugs found and fixed during the pre-release validation pass (browser-automated,
covering both demo accounts, all routes, CRUD, persistence, backup, permissions):

- `EntityRepository.softDelete()`/`restore()` silently failed to hide/restore
  records — "delete" didn't work anywhere in the app. This was the most significant
  fix in this release.
- A boot-time race condition duplicated the header on first paint.
- Module Manager's disable toggle was bypassed for the OWNER account, making it
  impossible to verify from the primary account.
- The Notification Center's unread badge didn't refresh after marking a notification
  read, and the header leaked a `document`-level click listener on every navigation.
- A crash in Family Hub (`appendChild(null)`) and a syntax error in the Owner module
  (mismatched parenthesis) that broke both Owner-only screens.

### Security

- No API keys or credentials hardcoded anywhere.
- Corporate data can only enter the app through the sanitized Corporate Collector
  path and defaults to PRIVATE visibility.
- Passwords are never stored in plain text.
