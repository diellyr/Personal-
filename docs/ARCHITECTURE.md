# Architecture

## Layering

Personal+ enforces a strict one-directional dependency chain:

```
UI (js/modules/*.js, js/ui/**)
  -> Services (js/core/*.js: tasks.js, notifications.js, backupService.js,
     exportImportService.js, ai/*, connectors/*, churchIntelligence.js,
     financeIntelligence.js, workIntelligence.js, careerIntelligence.js,
     jobIntelligence.js, englishIntelligence.js, skillGapRadar.js)
    -> Repositories (js/core/repository.js BaseRepository,
       js/core/entityRepository.js EntityRepository,
       js/core/entities/*.js dedicated repositories)
      -> DataProvider (js/core/dataProvider.js interface)
        -> IndexedDbProvider (js/core/indexedDbProvider.js)
          -> IndexedDB (js/core/db.js — schema + raw operations)
```

**No module, connector, or intelligence service ever imports `db.js` or
`indexedDbProvider.js` directly.** Everything goes through a Repository. This is what
lets `docs/MIGRATION_TO_SUPABASE.md` swap the bottom of the stack (a `SupabaseProvider`
implementing the same `DataProvider` interface) without touching a single module.

## Why one shared `records` store instead of one IndexedDB store per entity

The spec calls for 80+ distinct entity types (family children, church people, finance
transactions, job postings, career achievements, …). Rather than hand-writing an
IndexedDB object store + repository class for each one, `EntityRepository`
(`js/core/entityRepository.js`) scopes a single polymorphic `records` store by an
`entityType` string (e.g. `'family.child'`, `'finance.transaction'`). Domain fields live
under `record.data`; governance fields (`id`, `owner_id`, `visibility`, timestamps, soft
delete) live at the top level via `BaseRepository`.

Trade-off accepted deliberately: this is a simplification that keeps ~80 entity types
behind **one** well-tested CRUD/query/visibility engine instead of duplicating it 80
times. It remains trivially mappable to individual Postgres tables at migration time —
`entityType` becomes the table name (see `docs/MIGRATION_TO_SUPABASE.md`). A handful of
system stores that have genuinely different access patterns (`users`, `tasks`,
`notifications`, `audit_log`, `connectors_meta`, `settings`,
`permissions_overrides`) get their own dedicated IndexedDB object store and repository
class instead, because they need unique indexes or append-only semantics `records`
doesn't.

## The generic Entity Module engine

Most domain modules (Family, Church, Finance, Hobbies, Health, Career, Jobs, English,
Studies, CRM, Decisions, Pains, Ideas, Memory, Projects, Goals…) are **configuration**,
not bespoke UI code. `js/core/entityModuleEngine.js` exports `renderEntityCrud(container,
config)`, which given a field schema, table columns, filters, and optional Kanban
config renders a full list/search/filter/create/edit/delete/visibility UI backed by an
`EntityRepository`. This is what lets ~30 modules exist with real persistence without
30 independent (and inevitably inconsistent) CRUD implementations.

Modules that need real cross-entity logic (Command Center, AI Insights, Career Drift
Detector, Job Match Engine, Life Balance, Family Load, Skill Gap Radar, Financial
Decision Agent, Meeting ROI…) layer bespoke `core/*Intelligence.js` services on top of
one or more `EntityRepository`/`taskRepository` reads, and render bespoke dashboard UI.

## Cross-cutting services

- **AuthService** (`core/auth.js`) — local username/password auth (PBKDF2-SHA256,
  salted), session held in `sessionStorage` + in-memory (`core/session.js`).
- **PermissionService** (`core/permissions.js`) — RBAC (role → module → permission
  level) with per-user overrides, plus a separate resource-visibility axis
  (PRIVATE/FAMILY/CUSTOM) — see `docs/PERMISSIONS.md`.
- **AuditLogService** (`core/audit.js`) — append-only log of CREATE/UPDATE/DELETE/
  IMPORT/EXPORT/BACKUP/RESTORE/PERMISSION_CHANGE/INTEGRATION/LOGIN events.
- **NotificationService** (`core/notifications.js`) — in-app notifications with
  severity (INFO/OPPORTUNITY/WARNING/CRITICAL) and read/unread/resolved status.
- **TaskEngine** (`core/tasks.js`) — the single cross-module task store every module
  can create tasks into (`module`, `priority`, `status`, `owner`, `dueDate`, `source`,
  `linkedEntity`).
- **ModuleManager** (`core/moduleManager.js`) — installation-wide enable/disable per
  module, consulted by both the router and the sidebar.
- **ErrorHandler** (`core/errorHandler.js`) — every catch block reports through here,
  producing consistent toasts instead of `alert()`, and keeping a small in-memory log
  System Health can display.

## Router & navigation

`core/router.js` is a minimal hash router. `core/moduleRegistry.js` is the single
source of truth for every navigable module: its nav group, icon, the permission key
that gates it, and a lazy `import()` loader for its render module. Adding a module to
the app means adding one entry here — see `docs/DEVELOPMENT.md`.

Route resolution order: module exists → not disabled (Module Manager) → OWNER-only
check → RBAC `VIEW` permission check → lazy-load and render. `handleRoute()` uses a
monotonically increasing "generation" counter so an in-flight route resolution that
becomes stale (e.g. two navigations firing back-to-back) aborts before painting,
instead of racing another render into the same DOM nodes.

## UI layer

Framework-free: `js/ui/dom.js` exports a small `h(tag, attrs, children)` hyperscript
helper, and `js/ui/components/*.js` provide table, form, modal, kanban, tabs, toast,
and a tiny dependency-free SVG chart (bar/line/radar) library. No virtual DOM, no
build step — every render function tears down and rebuilds its container's subtree,
which is simple and fast enough at this data scale.
