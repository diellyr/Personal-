# Personal+ (Dielly OS)

Personal+ is a personal and family "operating system" that centralizes life, family,
work, career, English, studies, finances, church, hobbies, travel, decisions, pains,
automation opportunities, and cross-module intelligence in a single local-first web
application.

This is a **complete, functional, persistent release** (`v1.0.0` — see
`VERSION.md`/`CHANGELOG.md`): every module in the product spec is implemented with
real CRUD, real IndexedDB persistence, real permission checks, and real (rule-based)
intelligence. Nothing is a placeholder screen.

## Quick start

Requirements: any modern browser (Chrome, Edge, Firefox, Safari). No Node.js, build
step, or package manager needed to run the app — just a local static file server,
because ES modules and IndexedDB require `http://`, not `file://`.

```bash
python3 -m http.server 8000
# or: npx http-server -p 8000
```

Open `http://localhost:8000`.

## Demo users

| Username | Password    | Role          | Notes |
|----------|-------------|---------------|-------|
| `dielly` | `dielly123` | `OWNER`       | Full access to every module + Owner/Admin areas |
| `esposa` | `esposa123` | `FAMILY_ADMIN`| Family-scoped access, no Jobs/Admin/Owner |

Passwords are never stored in plain text (PBKDF2-SHA256 + salt via Web Crypto).

## Documentation

- **📘 Guia do usuário** (como usar o app no dia a dia): [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- **🛠️ Technical documentation**:
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (layering, file layout) ·
  [`docs/DATABASE.md`](docs/DATABASE.md) (IndexedDB schema, entity catalogue) ·
  [`docs/MODULES.md`](docs/MODULES.md) (every module, what it does, source files) ·
  [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md) (RBAC + visibility model) ·
  [`docs/CONNECTORS.md`](docs/CONNECTORS.md) (import connectors + sanitizer) ·
  [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) (AIProvider + rule engines) ·
  [`docs/BACKUP_RESTORE.md`](docs/BACKUP_RESTORE.md) ·
  [`docs/SECURITY.md`](docs/SECURITY.md) ·
  [`docs/MIGRATION_TO_SUPABASE.md`](docs/MIGRATION_TO_SUPABASE.md) ·
  [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) (conventions, how to add a module, testing)
- **📋 Status & release**: [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) ·
  [`FINAL_REPORT.md`](FINAL_REPORT.md) · [`VERSION.md`](VERSION.md) ·
  [`CHANGELOG.md`](CHANGELOG.md)

## License

Apache 2.0 — see `LICENSE`.
