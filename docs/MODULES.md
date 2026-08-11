# Modules

Every module below is fully implemented: real forms, real IndexedDB persistence, real
permission/visibility checks, real demo data. Source of truth for routing is
`js/core/moduleRegistry.js`.

## Command Center (`#/command-center`)
Today/Week/Month views, 3 top priorities, indicators, agenda aggregated from Tasks +
Church + Job interviews + Travel, and a live preview of AI Chief of Staff insights.

## Dashboards (`#/dashboards`)
Central chart aggregation across modules — Finance, Acompanha+ School, Work, Career,
English, Life Balance, Jobs, Church — each card reusing that module's own
Intelligence compute function and gated by the same module permission its full
screen uses. Links back to each module for the full drill-down.
`js/modules/dashboardsModule.js`.

## Life
- **Family** (`#/family`) — Esposo(a)/Casal, Filhos, Compromissos dos filhos,
  Pais/Mãe, Casa. `js/modules/familyModule.js`.
- **Family Hub** (`#/family-hub`) — shared dashboard for both accounts: upcoming
  family events, Family Load indicator, Acompanha+ integration status.
  `js/modules/familyHub.js`.
- **Acompanha+ School** (`#/acompanha-plus`) — dedicated home for Acompanha+
  school-tracking data: an embedded import card (JSON/CSV or demo dataset,
  reusing Import Center's connector card), a per-child summary (evolution,
  activities, recommendations, alerts, financeiro escolar), and a full CRUD
  table. `js/modules/acompanhaPlusModule.js`.
- **Church** (`#/church`) — Funções e Cargos, Pessoas, Agenda, Pregações e Estudos,
  Projetos, Acompanhamento, and Church Intelligence (People Attention Radar,
  Leadership Load, Ministry Health). `js/modules/churchModule.js`,
  `js/core/churchIntelligence.js`.
- **Finance** (`#/finance`) — Dashboard, Transações, Spending Intelligence, Goal
  Manager, Forecast (3/6/12 month linear projection), Financial Decision Agent
  ("posso gastar X?"), Dívidas & Investimentos. `js/modules/financeModule.js`,
  `js/core/financeIntelligence.js`.
- **Hobbies & Travel** (`#/hobbies-travel`) — Hobbies/lazer by category, Viagens
  (full trip planner: budget, itinerary, documents, checklist), Trip Dashboard
  (planned vs actual cost, days until departure, checklist progress).
  `js/modules/hobbiesTravelModule.js`.
- **Health** (`#/health`) — administrative health tracking (consultas, exames,
  medicamentos, hábitos, lembretes). `js/modules/healthModule.js`.

## Professional
- **Work Intelligence** (`#/work`) — Daily Work Brief, Weekly Work Review, Atividades
  (meetings/Jira/deep work/admin), Meeting Intelligence (ROI + Action Engine that
  spins meeting actions into Tasks), Jira Intelligence, Timesheet (day/week/month).
  `js/modules/workModule.js`, `js/core/workIntelligence.js`.
- **Career Intelligence** (`#/career`) — Career Dashboard, Achievement Tracker,
  Career Evidence Engine (skill scoring), Career Drift Detector (objective vs. recent
  activity), Career Vault (filterable evidence bank). `js/modules/careerModule.js`,
  `js/core/careerIntelligence.js`.
- **Job Hunter** (`#/jobs`) — Pipeline (11-stage Kanban), Vagas, Job Match Engine
  (Fit Score 0-100 with explanation), Application Agent (Prepare → Review → Approve
  → Execute, no auto-send), Salary Intelligence, Interview Manager.
  `js/modules/jobHunterModule.js`, `js/core/jobIntelligence.js`.
- **English Intelligence** (`#/english`) — Dashboard (radar of Grammar/Vocabulary/
  Fluency/Listening/Pronunciation/Response Speed/Exposure), English Immersion
  sessions, Meeting/Interview Simulators (via AIProvider), Weakness Engine (top
  recurring mistakes), Shadow English modes. `js/modules/englishModule.js`,
  `js/core/englishIntelligence.js`.
- **Studies & Skills** (`#/studies`) — courses/certifications/books/tracks +
  **Skill Gap Radar** (Job Hunter demand × Career level × Studies coverage).
  `js/modules/studiesModule.js`, `js/core/skillGapRadar.js`.

## Intelligence
- **AI Insights** (`#/ai-insights`) — combined AI Chief of Staff + Cross-Module
  Insight Service feed. `js/modules/aiInsightsModule.js`.
- **Life Balance** (`#/life-balance`) — radar across Work/Family/Church/Studies/
  English/Leisure/Health/Projects with over/under-indexed area callouts (not a moral
  score). `js/modules/lifeBalanceModule.js`.
- **Decision Intelligence** (`#/decisions`) — Decision Journal + Decision Review
  (expected vs. actual outcome). `js/modules/decisionModule.js`.
- **Pain & Opportunity** (`#/pains`) — Pain Tracker, Pain Detector (flags tasks
  repeated ≥3×), Automation Opportunity Engine (impact×frequency×time saved/effort
  ranking). `js/modules/painOpportunityModule.js`.
- **Idea Backlog** (`#/ideas`) — 7-stage Kanban linked to pains.
  `js/modules/ideaBacklogModule.js`.
- **Personal Memory** (`#/memory`) — typed memory entries (GOAL/PREFERENCE/FACT/
  DECISION/LESSON/PROJECT/CONTEXT/ACHIEVEMENT), AI-ready. `js/modules/memoryModule.js`.
- **Personal CRM** (`#/crm`) — Contatos + Follow-up Engine.
  `js/modules/personalCrmModule.js`.

## Projects
- **Projects** (`#/projects`) — `js/modules/projectsGoalsModule.js`.
- **Goals** (`#/goals`) — DAILY→LONG_TERM, linked to any module.
  `js/modules/goalsModule.js`.

## Admin (Admin group, gated by `admin` permission)
User Management, Import Center, Export Center, Backup & Restore, Module Manager,
Permission Manager, Privacy Manager, Integration Center, Audit Log, Data Management,
System Health, Test Runner — all in `js/modules/adminModule.js`,
`js/modules/importExportCenter.js`, `js/modules/backupRestoreUI.js`,
`js/modules/testRunner.js`.

## Owner (OWNER-only)
AI Settings and Corporate Collector (the only path corporate Jira/calendar data can
enter the app). `js/modules/ownerModule.js`.

## Cross-cutting
Notification Center (bell in the header), Global Search (`#/search`), Global
Calendar (`#/global-calendar`), Task Engine (`#/tasks`).
