# Security

## Passwords

Never stored in plain text. `js/core/auth.js` derives a 256-bit key via
**PBKDF2-SHA256, 100,000 iterations, random 16-byte salt** (Web Crypto
`crypto.subtle`) and stores only the resulting hash + salt (hex) in the `users`
store. Login re-derives the hash with the stored salt and compares.

## Sessions

`js/core/session.js` keeps the current user in memory and in `sessionStorage` (not
`localStorage`) — cleared when the browser tab/session ends, not a long-lived
persistent credential.

## No hardcoded secrets

- No API keys are hardcoded anywhere in the codebase.
- No real corporate credentials, hostnames, or infrastructure details are ever
  present in demo data — all demo data is clearly fictional and DEMO-tagged.
- The AI Settings screen (Owner-only) stores at most a masked tail of any API key a
  user chooses to paste in; the full value is never re-displayed or logged.

## IndexedDB is not a secrets vault

This is stated explicitly in the Owner → AI Settings screen: **local browser storage
does not provide backend-grade secret protection.** IndexedDB is readable by any code
running on the same origin and by anyone with access to the browser profile. Real,
sensitive API keys should not be entered until the app is backed by Supabase (or
another real backend) with server-side secret storage — see
`docs/MIGRATION_TO_SUPABASE.md`. Until then, the app is fully functional with the
zero-secrets `MockAIProvider`.

## Corporate data isolation

- Corporate Jira/calendar data can only enter the app through one path: Owner →
  Corporate Collector, which runs every record through `CorporateSanitizer`
  (`js/core/connectors/sanitizer.js`) before persisting — stripping URLs, IPs, and any
  field name matching a secret/credential/infra pattern, and truncating ticket
  references. See `docs/CONNECTORS.md`.
- Corporate-derived records default to `PRIVATE` visibility.
- The FAMILY_ADMIN role's default module permission on `work` is `VIEW` and on `jobs`
  is `NONE` — a spouse cannot edit/delete corporate-derived data or see job-search
  activity by default, independent of any single record's visibility flag.

## Owner privilege

- `OWNER` cannot be granted through any UI flow — it exists only because the initial
  seed creates exactly one such account. Admin → User Management's user-creation form
  only offers `FAMILY_ADMIN`/`MEMBER`.
- Owner-only screens are gated both by the router's `ownerOnly` flag (checked against
  `isOwner(user)`, independent of the module-permission override system) and by their
  module's permission — two independent checks that must both pass.

## Input handling

- Every value rendered from user/import data goes through the DOM (`textContent`/
  `h()` helper's text-node children), never `innerHTML` with unsanitized input — the
  one legitimate `html:` usage in `js/ui/dom.js`'s `h()` helper is opt-in per call
  site and is not used with untrusted content anywhere in the codebase.
- CSV/JSON import (`js/core/importUtils.js`) parses into plain objects; nothing
  imported is ever `eval`'d or inserted as HTML.
- Destructive actions (delete, restore-replace, clear module, permission changes to
  ADMIN/OWNER-equivalent) all go through `confirmDialog()` — no silent destructive
  action exists.

## Audit trail

Every CREATE/UPDATE/DELETE (via the generic entity engine or Task Engine),
IMPORT/EXPORT, BACKUP/RESTORE, PERMISSION_CHANGE, and INTEGRATION (connector import)
action writes an append-only `audit_log` row with the acting user, timestamp, and a
human-readable detail string — reviewable at Admin → Audit Log.
