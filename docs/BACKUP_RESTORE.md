# Backup & Restore

Location in-app: **Admin → Backup & Restore**. Implementation: `js/core/backupService.js`.

## Backup format

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-08-11T03:30:00.000Z",
  "data": {
    "users": [...],
    "audit_log": [...],
    "notifications": [...],
    "tasks": [...],
    "records": [...],
    "connectors_meta": [...],
    "settings": [...],
    "permissions_overrides": [...]
  }
}
```

One key per IndexedDB object store (`js/core/db.js`'s `storeNames()`), each holding
the store's raw rows.

## Export

"Exportar backup completo" calls `exportBackupToFile()`, which:

1. Reads every row from every store.
2. Downloads a `dielly-os-backup-<date>.json` file via a Blob URL (no server round
   trip — everything stays local).
3. Records the export timestamp in `settings.LAST_BACKUP_AT` (used by the Backup
   Reminder).
4. Writes a `BACKUP` audit log entry.

## Restore

Upload a `.json` file, choose a mode, and confirm:

- **MERGE** — every row in the backup is `put()` into its store (upsert by `id`).
  Existing rows not present in the backup are left untouched. Safe default for
  combining data from two devices/sessions.
- **REPLACE** — every store is cleared first, then the backup's rows are inserted.
  Destructive; requires an explicit confirmation dialog before proceeding.

`validateBackup()` checks `schemaVersion` and that `data.<store>` are arrays before
touching anything; a malformed file is rejected with a clear message and never
partially applied.

Every restore writes a `RESTORE` audit log entry with the record count and mode.

## Backup Reminder

`isBackupStale(lastBackupAt, days = 7)` flags backups older than 7 days; Admin →
Backup & Restore shows this as a status badge ("Backup desatualizado" vs. "Em dia").

## Manual test procedure

1. Create/edit a few records.
2. Export a backup.
3. Delete or change those records.
4. Restore the backup in MERGE mode.
5. Confirm the original values are back (covered by the in-app Test Runner's
   "Backup: restore MERGE round-trip preserves a record" test, and exercised manually
   during the validation pass — see `FINAL_REPORT.md`).
