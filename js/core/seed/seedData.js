import { userRepository } from '../entities/userRepository.js';
import { createUser } from '../auth.js';
import { settingsRepository } from '../entities/settingsRepository.js';
import { setSeeding } from '../seedContext.js';
import { setCurrentUser, getCurrentUser } from '../session.js';

// Registry of per-module demo-data seeders. Each module file that wants
// demo data calls `registerSeeder(fn)` at import time; `ensureSeeded()`
// (called once, on first boot) runs every registered seeder inside a
// single pass so no screen in the app is ever empty. Idempotent: seeders
// are only invoked the first time the app runs (SEED_FLAG in settings).
const seeders = [];
export function registerSeeder(fn) {
  seeders.push(fn);
}

let usersSeeded = null;

export async function ensureUsers() {
  if (usersSeeded) return usersSeeded;
  const existing = await userRepository.findAll();
  if (existing.length === 0) {
    const dielly = await createUser({
      username: 'dielly', email: 'diellyr@gmail.com', password: 'dielly123',
      displayName: 'Dielly', role: 'OWNER',
    });
    const esposa = await createUser({
      username: 'esposa', email: 'esposa@example.com', password: 'esposa123',
      displayName: 'Esposa', role: 'FAMILY_ADMIN',
    });
    usersSeeded = { dielly, esposa };
  } else {
    const dielly = existing.find((u) => u.username === 'dielly');
    const esposa = existing.find((u) => u.username === 'esposa');
    usersSeeded = { dielly, esposa };
  }
  return usersSeeded;
}

// Runs every registered seeder once, tagging everything it creates with
// `source: 'DEMO_SEED'` (via seedContext.js, consulted by BaseRepository /
// notify() / createTask()) so it can be found and removed later by
// deleteAllDemoData() in js/core/demoDataService.js.
export async function runSeedPass(users) {
  const prevUser = getCurrentUser();
  setCurrentUser(users.dielly); // seeders write as Dielly (OWNER) by default
  setSeeding(true);
  try {
    for (const seeder of seeders) {
      try {
        await seeder(users);
      } catch (err) {
        console.error('[seed] failed', err);
      }
    }
  } finally {
    setSeeding(false);
    setCurrentUser(prevUser || null);
  }
}

export async function ensureSeeded() {
  const users = await ensureUsers();
  const flag = await settingsRepository.get('DEMO_DATA_SEEDED');
  if (flag) return;
  await runSeedPass(users);
  await settingsRepository.set('DEMO_DATA_SEEDED', true);
}

// Dynamically import every module so their registerSeeder() calls run
// before ensureSeeded() executes the pass. Modules are cheap to import
// (no heavy work happens at import time, only function registration).
export async function loadAllSeeders() {
  const mods = [
    './globalSeed.js',
    '../../modules/familyModule.js',
    '../../modules/churchModule.js',
    '../../modules/financeModule.js',
    '../../modules/hobbiesTravelModule.js',
    '../../modules/healthModule.js',
    '../../modules/workModule.js',
    '../../modules/careerModule.js',
    '../../modules/jobHunterModule.js',
    '../../modules/englishModule.js',
    '../../modules/studiesModule.js',
    '../../modules/personalCrmModule.js',
    '../../modules/decisionModule.js',
    '../../modules/painOpportunityModule.js',
    '../../modules/ideaBacklogModule.js',
    '../../modules/memoryModule.js',
    '../../modules/projectsGoalsModule.js',
    '../../modules/goalsModule.js',
  ];
  for (const m of mods) {
    try { await import(m); } catch (err) { console.error('[seed] loader failed for', m, err); }
  }
}
