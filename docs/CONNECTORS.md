# Connectors

## Interface

`js/core/connectors/connector.js` defines the contract every connector implements:

```js
connect(config)     // store connector config
disconnect()        // clear active status
import(rawRecords)  // map + de-dup + persist + audit log
sync()              // re-run the same import (today: demo dataset; future: live API)
validate(rawRecords)
getStatus()          // { status, lastImportAt, totalRecordsImported, lastError, config }
```

`js/core/connectors/baseConnector.js` implements the shared behavior (mapping,
de-duplication by `external_id`, `connectors_meta` status tracking, `INTEGRATION`
audit logging) so each concrete connector only supplies `id`, `label`, the target
`entityType`, a `mapRecord(raw)` function, and a `demoDataset()`.

## Implemented connectors

| Connector | Target entityType | Feeds | File |
|---|---|---|---|
| Acompanha+ | `family.acompanhaEvent` | Family module | `acompanhaPlusConnector.js` |
| Backup Escola (Acompanha+) | `family.schoolGrade` | Acompanha+ School | `schoolBackupConnector.js` |
| Portal Expansão | `church.expansionEvent` | Church module | `expansionConnector.js` |
| Pluma | `finance.transaction` | Finance module | `plumaConnector.js` |
| Corporate Collector | `work.activity` | Work Intelligence | `corporateCollectorConnector.js` |
| Job Sources | `jobs.posting` | Job Hunter | `jobSourceConnector.js` |

### Backup Escola — the one connector that doesn't consume flat rows

Every connector above maps a flat array of already-record-shaped rows
(`raw -> mapRecord(raw) -> entity`). Backup Escola's source is different: a
full relational export (`{ generatedAt, tables: { students, assessments,
activities, assessmentCategories, grades, assessmentScales, ... } }`) with
no top-level array, so the generic JSON parser wraps it as a single-element
array containing the whole object. `SchoolBackupConnector.expand()` detects
that shape and calls `extractSchoolBackupRows(tables)`, which joins
`assessments -> activities -> assessmentCategories` (Regular/Bom/Ótimo
competency assessments) and `grades -> assessmentScales` (numeric or concept
subject grades), filters out any student flagged `isDemo` (the school
platform's own seed data, not this family's), and normalizes both onto a
comparable 0–10 `scoreValue`. `preview()`/`import()` are overridden to run
`expand()` first, then delegate to `BaseConnector`, so it plugs into the
existing per-connector import card with zero UI changes.

Every connector today supports:

1. **Demo dataset import** — one click, realistic sample data, useful for evaluating
   the app before hooking up a real source.
2. **File upload with mapped preview** (JSON or CSV) — each connector has its own
   card in Admin → Import Center with a file input, a "Pré-visualizar" step (applies
   that connector's `mapRecord()` field mapping and flags duplicates before anything
   is written), and "Confirmar importação". Owner → Corporate Collector uses the same
   pattern with an added sanitization step. Import Center's separate "arquivo
   genérico" section is a distinct, connector-agnostic path: it writes a file's raw
   columns directly into any chosen entity type with no field mapping — useful for
   data that didn't come from one of the five connectors.
3. **Duplicate detection** — `external_id` is derived from the source record's own id
   (or generated) and checked against existing records before insert; duplicates are
   skipped and counted, never overwritten silently.

`sync()` is a placeholder seam: it currently just re-imports the demo dataset, but the
call site and return shape (`{ imported, skipped, errors }`) are exactly what a real
API-backed `sync()` would return, so switching to a live integration later is a
one-file change per connector — nothing that calls a connector needs to change.

## CorporateSanitizer (`js/core/connectors/sanitizer.js`)

Applied by `CorporateCollectorConnector.mapRecord()` to every row before it's
persisted:

- Strips URLs and IP addresses from any string field.
- Drops any field whose key matches `/password|secret|token|key|credential|hostname|
  server|infra|cve-/i` (unless explicitly allow-listed).
- Reduces Jira/meeting rows to `{ category, timeMinutes, skills[], quantity, result,
  date, kind, ticketRef }` — the ticket reference itself is truncated
  (`TICKET-<last4>`), never the full internal ID.

This is the **only** path corporate data can enter the app — there is no direct
integration with any corporate system, by design (rule 28: "A ferramenta pessoal NÃO
deve tentar entrar diretamente no ambiente empresarial").

## Adding a new connector

1. Extend `BaseConnector` with your `entityType`.
2. Implement `mapRecord(raw)` (raw external shape → `{ externalId, ...domainFields }`).
3. Implement `demoDataset()` with 3-5 realistic rows.
4. Register it in Admin → Integration Center's `CONNECTORS` list
   (`js/modules/adminModule.js` / `importExportCenter.js`) if it should appear there.
