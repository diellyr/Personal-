# Changelog

All notable changes to this project are documented in this file. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows
[Semantic Versioning](https://semver.org/) — see `VERSION.md`.

## [Unreleased]

Nothing yet.

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
