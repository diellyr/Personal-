# Migration to Supabase

This app is architected so the IndexedDB phase can be replaced without rewriting any
module. This document explains how, not implements it — no Supabase code exists yet
by design (rule: "O código NÃO precisa integrar Supabase agora. Mas deve estar
preparado.").

## What makes this possible today

- Every record already has UUID primary keys, `created_at`/`updated_at`,
  `created_by`/`updated_by`, `owner_id`, `visibility`, `source`, `external_id`,
  `sync_status`, `deleted_at` — the exact column set a Postgres/Supabase schema with
  Row Level Security (RLS) needs.
- All data access goes through `DataProvider` (`js/core/dataProvider.js`), never
  IndexedDB directly. Swapping the implementation is a one-file change
  (`js/core/indexedDbProvider.js` → a new `supabaseProvider.js`) plus one line in each
  repository's constructor import.
- Auth is already abstracted behind `js/core/auth.js` / `js/core/session.js` — the
  call sites (`login`, `logout`, `restoreSession`, `getCurrentUser`) don't change when
  the implementation switches to Supabase Auth, only their internals do.

## Step-by-step plan

### 1. Schema mapping

| IndexedDB store | Postgres table(s) |
|---|---|
| `users` | `auth.users` (Supabase Auth) + a `profiles` table for `role`, `display_name` |
| `tasks` | `tasks` |
| `notifications` | `notifications` |
| `audit_log` | `audit_log` (append-only, consider partitioning by month at scale) |
| `records` | **one table per distinct `entityType`** (e.g. `family_child`,
  `finance_transaction`, `jobs_posting`, …) — `entityType` becomes the table name,
  `data` becomes that table's real columns (not a JSON blob — Postgres get real typed
  columns here, unlike the IndexedDB phase). A codegen pass over
  `KNOWN_ENTITY_TYPES` (`js/core/exportImportService.js`) + each module's field schema
  can generate the `CREATE TABLE` statements. |
| `connectors_meta` | `connectors_meta` |
| `settings` | `settings` |
| `permissions_overrides` | `permissions_overrides` |

Every generated table keeps the common columns (`id uuid primary key`, `created_at`,
`updated_at`, `created_by`, `updated_by`, `owner_id`, `visibility`,
`custom_visibility uuid[]`, `source`, `external_id`, `sync_status`, `deleted_at`).

### 2. Auth

Replace `js/core/auth.js`'s local PBKDF2 login with Supabase Auth
(`supabase.auth.signInWithPassword`). `role` moves from the `users` row into a
`profiles` table keyed by `auth.users.id`, or into JWT custom claims. `session.js`'s
`getCurrentUser()`/`setCurrentUser()` contract stays the same; only how it's populated
changes (from `supabase.auth.onAuthStateChange` instead of `sessionStorage`).

### 3. Row Level Security

For every generated table:

```sql
alter table finance_transaction enable row level security;

create policy "owner can see own private rows"
  on finance_transaction for select
  using (
    visibility = 'FAMILY'
    or owner_id = auth.uid()
    or (visibility = 'CUSTOM' and auth.uid() = any(custom_visibility))
    or exists (select 1 from profiles where id = auth.uid() and role = 'OWNER')
  );
```

This is a direct SQL translation of `canViewResource()` in
`js/core/permissions.js` — the client-side visibility function becomes the RLS
policy's `USING` clause, so the same rule is enforced server-side (defense in depth,
and it means the client no longer needs to filter after fetch).

Module-level RBAC (`getModulePermission`) becomes either a second RLS policy layer or
an API-level check in a thin Supabase Edge Function, depending on how strict you want
server enforcement to be beyond row visibility.

### 4. Storage

Add a `SupabaseProvider` implementing `js/core/dataProvider.js`'s interface
(`put/get/delete/getAll/getAllByIndex/clearStore/count`) using
`supabase.from(table).upsert/select/delete`. `getAllByIndex(storeName, indexName,
value)` becomes `supabase.from(table).select().eq(indexName, value)`.

### 5. Data migration

Use **Backup & Restore**'s existing export (`js/core/backupService.js`
`buildBackup()`) to produce the full JSON dump, then write a one-time script that:

```
IndexedDB (browser)
  -> Export Backup (Admin -> Backup & Restore -> Export)
  -> transform: flatten each `records` row of a given entityType into its
     target Postgres table's columns
  -> bulk insert via Supabase client or `psql \copy`
  -> Supabase (Postgres + Auth + RLS)
```

### 6. AI Provider

No change needed — `js/core/ai/aiProviderFactory.js` already resolves the active
provider from `settings`; adding `OpenAIProvider`/`ClaudeProvider`/`GeminiProvider`
classes that implement `js/core/ai/aiProvider.js`'s interface and wiring them into
the factory's switch is independent of the storage migration.

### 7. Cutover

Because every module talks to Repositories, not stores, the cutover is: swap
`indexedDbProvider.js` import for `supabaseProvider.js` in
`js/core/entities/*.js` and `js/core/entityRepository.js`, redeploy, done. No module
file (`js/modules/*.js`) needs to change.
