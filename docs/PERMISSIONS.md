# Permissions

Two independent axes, as required by the product spec — never conflate them.

## 1. Module permission (RBAC)

`js/core/permissions.js`. A user has a permission **level** per module:

```
NONE=0 < VIEW=1 < CREATE=2 < EDIT=3 < DELETE=4 < ADMIN=5 < OWNER=6
```

Roles:

- **OWNER** — exactly one account (`dielly`). Always resolves to the max level for
  every module. Cannot be granted through the UI (`docs/SECURITY.md`), and is a
  hardcoded special case — never a row in any permissions table.
- **FAMILY_ADMIN** and **MEMBER** — the two built-in non-owner roles.
- **Custom roles** — the Owner can create additional roles at runtime (Admin → User
  Management → "Roles" → "+ Nova role"), e.g. "ACCOUNTANT" or "GUEST". A new role
  starts with **NONE on every module** (principle of least privilege) until the Owner
  grants it access. See `js/core/roleService.js`.

Role-level default permissions are **data-driven**, not hardcoded: every non-OWNER
role has one row per module in the `admin.rolePermission` entity type (managed by
`js/core/roleService.js`, cached and read by `js/core/permissions.js`). This applies
uniformly to FAMILY_ADMIN, MEMBER, and every custom role — there's no special-cased
built-in-vs-custom logic in the permission-resolution path itself, only in whether a
role can be deleted (built-in roles can't) or renamed.

`ensureBuiltInRoles()` runs on every boot (independent of demo-data seeding) and is
idempotent: on a fresh install it creates the `FAMILY_ADMIN`/`MEMBER` role rows with
the same defaults this file used to hardcode (EDIT on most modules for FAMILY_ADMIN,
VIEW-only on `work`/`career`, NONE on `jobs`/`admin`/`owner`; VIEW everywhere for
MEMBER) — corporate/job-search data stays private to the account that owns the
career, per rule 102 of the spec. On a later boot it's a no-op for roles that already
exist, so an Owner's customizations are never overwritten.

Admin → Permission Manager renders two live matrices:

1. **Role × module × permission (default)** — sets each role's baseline access.
   Newly created roles appear here automatically (it just queries all roles fresh on
   render) — no extra wiring needed between "create role" and "configure its access".
2. **User × module × permission (exceptions)** — per-user overrides on top of #1,
   backed by the `permissions_overrides` store, unchanged from before.

Both call their respective `set*Permission`/`removeOverride` functions and write a
`PERMISSION_CHANGE` audit entry immediately on change — no save button, no page
reload needed.

Every router navigation and every sidebar item is gated by `can(user, moduleKey,
'VIEW')`; every entity module's create/edit/delete buttons are independently gated by
`can(user, moduleKey, 'CREATE'|'EDIT'|'DELETE')` — a user can have `VIEW` on Finance
and see it, without being able to edit it.

## 2. Resource visibility (independent of module permission)

Every record (in the `records` store) carries its own `visibility`:

- **PRIVATE** — only the owner (`owner_id`) can see it. Default for Finance, Career,
  Jobs, English, Health, Work, CRM, Decisions, Pains, Ideas, Memory, Projects — i.e.
  anything personal or corporate-adjacent.
- **FAMILY** — any authenticated user can see it. Default for Family, Church,
  Hobbies/Travel, Goals — shared household data.
- **CUSTOM** — visible to `owner_id` plus an explicit `custom_visibility` user-id list.

`canViewResource(user, record)` (`js/core/permissions.js`) is the single choke point
every list screen, Global Search, and Global Calendar filters through. A user can have
`ADMIN` module permission on Finance and still not see another user's `PRIVATE`
finance record — module permission answers "can I use this module at all", visibility
answers "can I see this specific record".

The OWNER role bypasses visibility (sees everything) by design — "Owner deve ter
controle total" (rule 12).

## Corporate data privacy

Corporate-sourced records (imported via Owner → Corporate Collector, entityType
`work.activity`, source `CORPORATE-COLLECTOR`) default to `PRIVATE` like every other
record — the spouse's FAMILY_ADMIN role additionally has only `VIEW` on the `work`
module by default, and `NONE` on `jobs`, so corporate/job-search information isn't
casually surfaced to a household member. This is belt-and-suspenders: even if an
Owner later marks a work record `FAMILY`, the spouse's `work` module permission caps
what they can do with it.

## OWNER hard-guarantees

- `OWNER` role can only exist because it was seeded (`js/core/seed/seedData.js`) —
  there is no UI path that grants `OWNER`. Admin → User Management's "new user" form
  offers every existing role (built-in and custom) except `OWNER`, which is filtered
  out unconditionally in `js/core/roleService.js`'s `createRole()` (the name `OWNER`
  is rejected outright, even as a custom role name).
- Owner-only screens (`js/modules/ownerModule.js`) are additionally guarded by
  `isOwner(user)` in the router (`def.ownerOnly`), independent of the module
  permission system — even an ADMIN-level override could not open them.
