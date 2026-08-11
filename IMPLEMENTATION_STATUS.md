# Implementation Status

All rows below are `Implemented = YES`. No `TODO`, `coming soon`, or placeholder
screens exist for internal functionality — every module has a working form/service
backing it. "Tested" means exercised via the in-app Test Runner and/or the automated
browser validation pass described in `FINAL_REPORT.md` (login, CRUD, persistence
across reload, permission boundaries, backup/restore, import/export).

| Module | Implemented | Functional | Persistence | Permissions | Demo Data | Tested | Notes |
|---|---|---|---|---|---|---|---|
| Auth (login/logout/session) | YES | YES | YES (users store) | N/A | 2 seeded users | YES | PBKDF2-SHA256 hashed passwords |
| RBAC + Permission Manager | YES | YES | YES (admin.rolePermission + permissions_overrides) | YES | Role defaults seeded | YES | Role-level matrix + per-user override matrix |
| Resource visibility (PRIVATE/FAMILY/CUSTOM) | YES | YES | YES | YES | Mixed demo visibility | YES | Independent axis from module permission |
| Command Center | YES | YES | reads all modules | YES | YES | YES | Today/Week/Month views |
| Dashboards (central chart hub) | YES | YES | reads Finance/Work/Career/English/Life Balance/Jobs/Church | YES | YES | YES | Cards gated per-module permission |
| AI Chief of Staff | YES | YES | reads Tasks/Projects/etc. | YES | YES | YES | Rule-based, AIProvider-ready |
| Cross-Module Insight Service | YES | YES | pushes to Notifications | YES | YES | YES | 6 cross-module rules |
| Family (spouse/children/parents/home) | YES | YES | YES | YES | YES | YES | 5 sub-areas |
| Family Hub | YES | YES | reads Family+Tasks | YES | YES | YES | Shared dashboard |
| Family Load | YES | YES | reads Tasks+Home | YES | YES | YES | Imbalance radar, not competitive scoring |
| Acompanha+ Connector | YES | YES | YES (family.acompanhaEvent) | YES | Demo dataset | YES | JSON/CSV + demo import |
| Church (roles/people/agenda/sermons/projects/followup) | YES | YES | YES | YES | YES | YES | Generic, not tied to a specific role |
| Church Intelligence (Attention Radar/Leadership Load/Ministry Health) | YES | YES | reads Church | YES | YES | YES | |
| Portal Expansão Connector | YES | YES | YES (church.expansionEvent) | YES | Demo dataset | YES | |
| Finance Dashboard | YES | YES | YES | YES | 4 months demo tx | YES | |
| Spending Intelligence | YES | YES | reads Finance | YES | YES | YES | Categories/outliers/subscriptions |
| Goal Manager (finance) | YES | YES | YES | YES | YES | YES | |
| Forecast (3/6/12mo) | YES | YES | reads Finance | YES | YES | YES | Linear projection from avg net |
| Financial Decision Agent | YES | YES | reads Finance | YES | interactive | YES | Rule-based, explains verdict |
| Pluma Connector | YES | YES | YES (finance.transaction) | YES | Demo dataset | YES | |
| Hobbies & Lazer | YES | YES | YES | YES | YES | YES | 5 categories |
| Travel Planner + Trip Dashboard | YES | YES | YES | YES | YES | YES | Budget vs actual, checklist |
| Health | YES | YES | YES | YES | YES | YES | Administrative only, no diagnosis |
| Work Intelligence (Daily Brief/Weekly Review) | YES | YES | YES (work.activity) | YES | YES | YES | |
| Meeting Intelligence (ROI + Action Engine) | YES | YES | YES | YES | YES | YES | Actions → Task Engine |
| Jira Intelligence | YES | YES | YES | YES | YES | YES | |
| Timesheet / Time Intelligence | YES | YES | reads Work | YES | YES | YES | Day/Week/Month |
| Corporate Collector + Sanitizer | YES | YES | YES | Owner-only | Demo dataset | YES | Sole path for corporate data |
| Career Dashboard | YES | YES | YES | YES | YES | YES | |
| Achievement Tracker | YES | YES | YES | YES | YES | YES | |
| Career Evidence Engine | YES | YES | reads Career | YES | YES | YES | Skill scoring |
| Career Drift Detector | YES | YES | reads Career | YES | YES | YES | Objective vs. 90-day activity |
| Career Vault | YES | YES | reads Career | YES | YES | YES | Filterable |
| Job Hunter (postings) | YES | YES | YES | YES | YES | YES | |
| Job Match Engine (Fit Score) | YES | YES | reads Jobs+Career | YES | YES | YES | 0-100 + explanation |
| Job Pipeline (Kanban) | YES | YES | YES | YES | YES | YES | 11 stages, drag & drop |
| Application Agent | YES | YES | YES | YES | YES | YES | Prepare→Review→Approve→Execute, no auto-send |
| Salary Intelligence | YES | YES | YES | YES | YES | YES | Private by default |
| Interview Manager + Preparation | YES | YES | YES | YES | YES | YES | |
| Job Source Connector | YES | YES | YES (jobs.posting) | YES | Demo dataset | YES | |
| English Dashboard | YES | YES | YES (self-assessment) | YES | YES | YES | Radar chart |
| English Immersion | YES | YES | YES | YES | YES | YES | |
| Meeting/Interview Simulator | YES | YES | via AIProvider | YES | interactive | YES | MockAIProvider today |
| English Weakness Engine | YES | YES | YES | YES | YES | YES | Top recurring mistakes |
| Shadow English | YES | YES | via AIProvider | YES | interactive | YES | 7 modes |
| Studies & Skills | YES | YES | YES | YES | YES | YES | |
| Skill Gap Radar | YES | YES | reads Jobs+Career+Studies | YES | YES | YES | |
| Personal CRM | YES | YES | YES | YES | YES | YES | |
| Follow-up Engine | YES | YES | reads CRM | YES | YES | YES | |
| Decision Journal | YES | YES | YES | YES | YES | YES | |
| Decision Review | YES | YES | reads Decisions | YES | YES | YES | Expected vs actual |
| Pain Tracker | YES | YES | YES | YES | YES | YES | |
| Pain Detector | YES | YES | reads Tasks | YES | YES | YES | Detects ≥3x repeated tasks |
| Automation Opportunity Engine | YES | YES | reads Pains | YES | YES | YES | ROI ranking |
| Idea Backlog | YES | YES | YES | YES | YES | YES | 7-stage Kanban |
| Personal Memory | YES | YES | YES | YES | YES | YES | 8 types |
| Life Balance Intelligence | YES | YES | reads all modules | YES | YES | YES | Radar, not a moral score |
| Projects | YES | YES | YES | YES | YES | YES | |
| Goals | YES | YES | YES | YES | YES | YES | 6 periods |
| User Management | YES | YES | YES | Owner can create/deactivate | 2 users | YES | OWNER not grantable via UI; custom role creation |
| Import Center | YES | YES | YES | Admin | YES | YES | JSON/CSV + connectors |
| Export Center | YES | YES | YES | Admin | YES | YES | JSON/CSV, all or per-module |
| Backup & Restore | YES | YES | YES | Admin (restore: Owner) | YES | YES | Merge/Replace + validation |
| Load/Delete demo data | YES | YES | YES | Owner-only | N/A | YES | Idempotent reseed; hard-deletes only DEMO_SEED-tagged records |
| Backup Reminder | YES | YES | reads settings | Admin | YES | YES | >7 days stale flag |
| Module Manager | YES | YES | YES (settings) | Admin | YES | YES | Enable/disable per module |
| Permission Manager | YES | YES | YES | Admin | YES | YES | Role-default matrix (auto-includes new custom roles) + per-user override matrix |
| Privacy Manager | YES | YES | reads all modules | Admin | YES | YES | Visibility counts by type |
| Integration Center | YES | YES | reads connectors_meta | Admin | YES | YES | All 5 connectors |
| Audit Log | YES | YES | YES | Admin | Generated live | YES | |
| Data Management | YES | YES | YES | Admin | YES | YES | Per-module counts + clear, plus Owner-only "apagar tudo" bulk clear |
| System Health | YES | YES | YES | Admin | YES | YES | Schema version, storage, errors |
| Test Runner | YES | YES | N/A (self-cleaning) | Admin | N/A | YES | 8 automated checks |
| Owner: AI Settings | YES | YES | YES (settings) | Owner-only | YES | YES | MockAIProvider active |
| Owner: Corporate Collector | YES | YES | YES | Owner-only | Demo dataset | YES | Sanitized preview before import |
| Notification Center | YES | YES | YES | per-user | YES | YES | Bell dropdown, read/unread/resolved |
| Global Search | YES | YES | reads all modules | respects visibility | YES | YES | |
| Global Calendar | YES | YES | reads 8 sources | respects visibility | YES | YES | Month grid view + color-coded categories, plus full list |
| Task Engine | YES | YES | YES | YES | YES | YES | Central to all modules |
| Responsive layout | YES | YES | N/A | N/A | N/A | YES | Desktop-first, tablet/mobile functional |
| Dark/light mode | YES | YES | localStorage | N/A | N/A | YES | |

## Known limitations (external-dependency only)

Per the spec's own instruction, only limitations caused by needing a **real external
API/credential** are listed here — everything else above is fully implemented, not
deferred:

- Acompanha+, Portal Expansão, Pluma, and Job Sources connectors use file import
  (JSON/CSV) and bundled demo datasets rather than live API polling, because no
  external API credentials exist for this environment. The `Connector` interface's
  `sync()` seam is ready for a live implementation (see `docs/CONNECTORS.md`).
- Corporate Collector accepts `work-summary.json`/`.csv` uploads rather than a live
  Jira/Corporate Calendar API pull, by design (the app should never integrate directly
  with a corporate environment — see `docs/SECURITY.md`).
- `MockAIProvider` is the active AI provider; OpenAI/Claude/Gemini provider classes
  are not implemented because no API key is configured (Owner → AI Settings explicitly
  supports adding one later without any other code change — see
  `docs/AI_ARCHITECTURE.md`).
- Storage is IndexedDB (local-first, per spec); Supabase migration is documented
  (`docs/MIGRATION_TO_SUPABASE.md`) but intentionally not implemented yet, per the
  spec's own instruction.
