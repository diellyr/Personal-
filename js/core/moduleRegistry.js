// Central registry of every navigable module: nav grouping, icon, the RBAC
// module key it's gated by, and a lazy loader for its render module.
// Adding a module to the app means adding exactly one entry here.

export const NAV_GROUPS = [
  { key: 'COMMAND', label: 'Command Center' },
  { key: 'LIFE', label: 'Life' },
  { key: 'PROFESSIONAL', label: 'Professional' },
  { key: 'INTELLIGENCE', label: 'Intelligence' },
  { key: 'PROJECTS', label: 'Projects' },
  { key: 'ADMIN', label: 'Admin' },
  { key: 'OWNER', label: 'Owner' },
];

export const MODULES = [
  { key: 'command-center', label: 'Command Center', group: 'COMMAND', icon: '🏠', permission: 'command_center', loader: () => import('../modules/commandCenter.js') },
  { key: 'dashboards', label: 'Dashboards', group: 'COMMAND', icon: '📊', permission: 'command_center', loader: () => import('../modules/dashboardsModule.js') },
  { key: 'global-calendar', label: 'Global Calendar', group: 'COMMAND', icon: '📅', permission: 'calendar', loader: () => import('../modules/globalCalendar.js') },
  { key: 'tasks', label: 'Tasks', group: 'COMMAND', icon: '✅', permission: 'tasks', loader: () => import('../modules/taskEngineUI.js') },
  { key: 'search', label: 'Global Search', group: 'COMMAND', icon: '🔎', permission: 'search', loader: () => import('../modules/globalSearch.js') },

  { key: 'family', label: 'Family', group: 'LIFE', icon: '👨‍👩‍👧‍👦', permission: 'family', loader: () => import('../modules/familyModule.js') },
  { key: 'family-hub', label: 'Family Hub', group: 'LIFE', icon: '🧩', permission: 'family', loader: () => import('../modules/familyHub.js') },
  { key: 'acompanha-plus', label: 'Acompanha+ School', group: 'LIFE', icon: '🎓', permission: 'family', loader: () => import('../modules/acompanhaPlusModule.js') },
  { key: 'church', label: 'Church', group: 'LIFE', icon: '⛪', permission: 'church', loader: () => import('../modules/churchModule.js') },
  { key: 'finance', label: 'Finance', group: 'LIFE', icon: '💰', permission: 'finance', loader: () => import('../modules/financeModule.js') },
  { key: 'hobbies-travel', label: 'Hobbies & Travel', group: 'LIFE', icon: '🧳', permission: 'hobbies', loader: () => import('../modules/hobbiesTravelModule.js') },
  { key: 'health', label: 'Health', group: 'LIFE', icon: '🩺', permission: 'health', loader: () => import('../modules/healthModule.js') },

  { key: 'work', label: 'Work Intelligence', group: 'PROFESSIONAL', icon: '💼', permission: 'work', loader: () => import('../modules/workModule.js') },
  { key: 'career', label: 'Career Intelligence', group: 'PROFESSIONAL', icon: '🚀', permission: 'career', loader: () => import('../modules/careerModule.js') },
  { key: 'jobs', label: 'Job Hunter', group: 'PROFESSIONAL', icon: '🎯', permission: 'jobs', loader: () => import('../modules/jobHunterModule.js') },
  { key: 'english', label: 'English Intelligence', group: 'PROFESSIONAL', icon: '🗣️', permission: 'english', loader: () => import('../modules/englishModule.js') },
  { key: 'studies', label: 'Studies & Skills', group: 'PROFESSIONAL', icon: '📚', permission: 'studies', loader: () => import('../modules/studiesModule.js') },

  { key: 'ai-insights', label: 'AI Insights', group: 'INTELLIGENCE', icon: '🤖', permission: 'intelligence', loader: () => import('../modules/aiInsightsModule.js') },
  { key: 'life-balance', label: 'Life Balance', group: 'INTELLIGENCE', icon: '⚖️', permission: 'intelligence', loader: () => import('../modules/lifeBalanceModule.js') },
  { key: 'decisions', label: 'Decision Intelligence', group: 'INTELLIGENCE', icon: '🧭', permission: 'intelligence', loader: () => import('../modules/decisionModule.js') },
  { key: 'pains', label: 'Pain & Opportunity', group: 'INTELLIGENCE', icon: '🩹', permission: 'intelligence', loader: () => import('../modules/painOpportunityModule.js') },
  { key: 'ideas', label: 'Idea Backlog', group: 'INTELLIGENCE', icon: '💡', permission: 'intelligence', loader: () => import('../modules/ideaBacklogModule.js') },
  { key: 'memory', label: 'Personal Memory', group: 'INTELLIGENCE', icon: '🧠', permission: 'intelligence', loader: () => import('../modules/memoryModule.js') },
  { key: 'crm', label: 'Personal CRM', group: 'INTELLIGENCE', icon: '📇', permission: 'crm', loader: () => import('../modules/personalCrmModule.js') },

  { key: 'projects', label: 'Projects', group: 'PROJECTS', icon: '📁', permission: 'projects', loader: () => import('../modules/projectsGoalsModule.js') },
  { key: 'goals', label: 'Goals', group: 'PROJECTS', icon: '🎯', permission: 'projects', loader: () => import('../modules/goalsModule.js') },

  { key: 'admin-users', label: 'User Management', group: 'ADMIN', icon: '👥', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'users' },
  { key: 'admin-import', label: 'Import Center', group: 'ADMIN', icon: '📥', permission: 'admin', loader: () => import('../modules/importExportCenter.js'), view: 'import' },
  { key: 'admin-export', label: 'Export Center', group: 'ADMIN', icon: '📤', permission: 'admin', loader: () => import('../modules/importExportCenter.js'), view: 'export' },
  { key: 'admin-backup', label: 'Backup & Restore', group: 'ADMIN', icon: '🗄️', permission: 'admin', loader: () => import('../modules/backupRestoreUI.js') },
  { key: 'admin-modules', label: 'Module Manager', group: 'ADMIN', icon: '🧱', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'modules' },
  { key: 'admin-permissions', label: 'Permission Manager', group: 'ADMIN', icon: '🔐', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'permissions' },
  { key: 'admin-privacy', label: 'Privacy Manager', group: 'ADMIN', icon: '🕶️', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'privacy' },
  { key: 'admin-integrations', label: 'Integration Center', group: 'ADMIN', icon: '🔌', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'integrations' },
  { key: 'admin-audit', label: 'Audit Log', group: 'ADMIN', icon: '📜', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'audit' },
  { key: 'admin-data', label: 'Data Management', group: 'ADMIN', icon: '🗃️', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'data' },
  { key: 'admin-health', label: 'System Health', group: 'ADMIN', icon: '❤️‍🩹', permission: 'admin', loader: () => import('../modules/adminModule.js'), view: 'health' },
  { key: 'admin-tests', label: 'Test Runner', group: 'ADMIN', icon: '🧪', permission: 'admin', loader: () => import('../modules/testRunner.js') },

  { key: 'owner-ai', label: 'AI Settings', group: 'OWNER', icon: '⚙️', permission: 'owner', ownerOnly: true, loader: () => import('../modules/ownerModule.js'), view: 'ai' },
  { key: 'owner-corporate', label: 'Corporate Collector', group: 'OWNER', icon: '🏢', permission: 'owner', ownerOnly: true, loader: () => import('../modules/ownerModule.js'), view: 'corporate' },
];

export function findModule(key) {
  return MODULES.find((m) => m.key === key);
}

export function modulesByGroup(groupKey) {
  return MODULES.filter((m) => m.group === groupKey);
}
