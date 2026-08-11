# Database

Storage engine: **IndexedDB**, database name `dielly_os`, schema version `1`
(`js/core/db.js`). All primary keys are **UUID v4** strings (`js/core/uuid.js`) so
records are Supabase/Postgres-UUID compatible from day one.

## Object stores

| Store | Purpose | Key indexes |
|---|---|---|
| `users` | Accounts (Dielly = OWNER, spouse = FAMILY_ADMIN, future MEMBERs) | `username` (unique), `email`, `status` |
| `audit_log` | Append-only audit trail | `timestamp`, `userId`, `action` |
| `notifications` | In-app Notification Center | `userId`, `status`, `createdAt`, `module` |
| `tasks` | Central Task Engine (cross-module) | `module`, `status`, `owner`, `dueDate`, `deletedAt` |
| `records` | **Polymorphic store for ~35 domain entity types** (see below) | `entityType`, `ownerId`, `updatedAt`, `deletedAt`, `visibility` |
| `connectors_meta` | One row per connector (status, last import, config) | — |
| `settings` | Key/value app settings (AI settings, module enable/disable, demo-seed flag, last backup) | — |
| `permissions_overrides` | Per-user, per-module permission overrides | `userId`, `module` |

## Common fields (every `records` row, via `BaseRepository`)

```
id            UUID v4
entityType    string, e.g. 'finance.transaction'
data          { ...domain-specific fields... }
created_at    ISO timestamp
updated_at    ISO timestamp
created_by    user id
updated_by    user id
owner_id      user id
visibility    PRIVATE | FAMILY | CUSTOM
custom_visibility  user id[] (when visibility = CUSTOM)
source        MANUAL | ACOMPANHA-PLUS | EXPANSION | PLUMA | CORPORATE-COLLECTOR | JOB-SOURCE | DEMO_SEED
external_id   string | null (set by connectors, used for de-dup)
sync_status   LOCAL | SYNCED
deleted_at    ISO timestamp | null (soft delete)
```

## Entity type catalogue (the `records` store's `entityType` values)

| Domain | entityType values |
|---|---|
| Family | `family.spouse`, `family.child`, `family.childEvent`, `family.parentCare`, `family.home`, `family.acompanhaEvent` |
| Church | `church.role`, `church.person`, `church.agenda`, `church.sermon`, `church.project`, `church.followup`, `church.expansionEvent` |
| Finance | `finance.transaction`, `finance.goal`, `finance.debt`, `finance.investment` |
| Hobbies/Travel | `hobbies.item`, `travel.trip` |
| Health | `health.record` |
| Work | `work.activity` (meetings/Jira/deep work/admin, discriminated by `data.kind`) |
| Career | `career.achievement`, `career.objective` |
| Jobs | `jobs.posting`, `jobs.application`, `jobs.salaryInfo`, `jobs.interview` |
| English | `english.session`, `english.mistake`, `english.selfAssessment` |
| Studies | `studies.item` |
| CRM | `crm.contact` |
| Intelligence | `decisions.decision`, `pains.pain`, `ideas.idea`, `memory.item` |
| Projects | `projects.project`, `goals.goal` |
| Tests | `test.sample` (used only by the in-app Test Runner, cleaned up after each run) |

This list is also exported as `KNOWN_ENTITY_TYPES` in
`js/core/exportImportService.js`, used by Export Center, Data Management, Privacy
Manager, and Global Search so they never need updating by hand when a new module is
added beyond adding the type there.

## Indexes and performance

Every store has the indexes it needs for its real query patterns (by owner, by status,
by due date, by entity type, by visibility) so list screens use `getAllByIndex` rather
than scanning the entire store. At this app's scale (personal use, thousands not
millions of rows) full-store scans inside a single `entityType` are also acceptable and
used where a composite index would add complexity for no measurable benefit (e.g.
Global Search).

## Soft delete

`deleted_at` is set instead of hard-deleting rows (rule: prefer soft delete). All
`findAll()` repository methods filter out soft-deleted rows by default; pass
`{ includeDeleted: true }` to see them (used by Admin → User Management to show
deactivated users). Data Management → "Limpar módulo" only soft-deletes; nothing in
the UI hard-deletes except the Backup & Restore REPLACE flow (which is explicitly
destructive and confirmed).

## Schema versioning & migrations

`SCHEMA_VERSION` in `js/core/db.js` is `1`. IndexedDB's own `onupgradeneeded` hook is
where future schema changes (new stores/indexes) would be added, keyed off
`event.oldVersion`. Because almost all domain data lives in the generic `records`
store, most future "schema changes" are additive `entityType` values that need no
IndexedDB migration at all — only new code.
