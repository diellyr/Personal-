# Development Guide

## Running locally

```bash
python3 -m http.server 8000   # or any static file server
```

Open `http://localhost:8000`. No build step, no `npm install`, no bundler — plain ES
modules served as-is. Edits to any `.js`/`.css` file take effect on next page reload.

## Conventions

- **No module imports IndexedDB directly.** Always go through a Repository. See
  `docs/ARCHITECTURE.md`.
- **No `alert()`.** Use `reportError`/`reportSuccess`/`reportWarning`/`reportInfo`
  from `js/core/errorHandler.js` (renders a toast) and `confirmDialog()` from
  `js/ui/components/modal.js` for destructive-action confirmation.
- **No direct `appendChild(possiblyNull)`.** `h()`'s children array silently skips
  `null`/`undefined`/`false`, but a bare `container.appendChild(x ? node : null)`
  throws — always route conditional nodes through an `h(...)` children array, or gate
  with `if (x) container.appendChild(node)`.
- **Soft delete only** for user-facing delete actions (`repo.softDelete(id)`), never
  `hardDelete` from the UI.
- Every entity record's domain fields live under `.data`; common governance fields
  (`visibility`, `owner_id`, timestamps, `deleted_at`) live at the top level — see
  `docs/DATABASE.md`.

## Adding a new domain module (the common case)

Most modules are config, not code. Steps:

1. Pick an `entityType` string, e.g. `'newmodule.item'`.
2. In `js/modules/newModule.js`, define a field/column config and call
   `renderEntityCrud(container, { entityType, title, icon, fields, columns, user,
   permissionModule, defaultVisibility, filters, kanban? })` from
   `js/core/entityModuleEngine.js`. See `js/modules/healthModule.js` for the smallest
   complete example, or `js/modules/familyModule.js` for a multi-tab example.
3. Register demo data: `registerSeeder(async ({ dielly, esposa }) => { ... })` at the
   bottom of the module file, using `createEntityService(entityType)`.
4. Add the module file's path to the `mods` array in
   `js/core/seed/seedData.js`'s `loadAllSeeders()`.
5. Add an entry to `js/core/moduleRegistry.js`'s `MODULES` array (key, label, group,
   icon, `permission`, lazy `loader`).
6. If the module introduces a genuinely new `entityType`, add it to
   `KNOWN_ENTITY_TYPES` in `js/core/exportImportService.js` so Export Center, Data
   Management, Privacy Manager, and Global Search pick it up automatically.
7. If the module needs cross-entity logic (dashboards, scoring, detection rules),
   add a `js/core/<name>Intelligence.js` service — pure functions over
   `EntityRepository`/`taskRepository` reads — and call it from the module's bespoke
   dashboard tab.

## Adding a new connector

See `docs/CONNECTORS.md`'s "Adding a new connector" section.

## Adding a new AI-consuming feature

Call `getActiveAiProvider()` (`js/core/ai/aiProviderFactory.js`) and use one of the
five `AIProvider` methods — never assume `MockAIProvider` directly, so the feature
keeps working unchanged once a real provider is wired in. See
`docs/AI_ARCHITECTURE.md`.

## Testing

Admin → Test Runner (`js/modules/testRunner.js`) is the project's test harness — no
external test framework, runs in-browser against the live `EntityRepository`/
`permissions`/`backupService`/connector code, using a disposable `test.sample`
entityType it cleans up after itself. Add new tests as additional `test('name',
async () => { ... throw on failure ... })` calls in that file.

## Debugging tips

- A blank/erroring module screen: check the browser console — `js/core/router.js`
  reports the failing module key via `reportError(err, 'router:<moduleKey>')`, and the
  error also surfaces as a toast.
- Browser DevTools → Application → IndexedDB → `dielly_os` to inspect raw data.
- Admin → System Health shows the schema version, store count, storage usage
  estimate, and the in-session error log.
- Admin → Audit Log shows every mutating action with who/when/what.
