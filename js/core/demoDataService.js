import { EntityRepository } from './entityRepository.js';
import { taskRepository } from './entities/taskRepository.js';
import { dataProvider } from './indexedDbProvider.js';
import { KNOWN_ENTITY_TYPES } from './exportImportService.js';
import { ensureUsers, runSeedPass } from './seed/seedData.js';
import { settingsRepository } from './entities/settingsRepository.js';
import { logAudit } from './audit.js';

/**
 * Backs the "Excluir dados demo" / "Carregar dados demo" buttons in
 * Admin -> Backup & Restore. Scoped strictly to records tagged
 * `source: 'DEMO_SEED'` by the seed pass (see js/core/seedContext.js) —
 * never touches the two real accounts, and never touches records a user
 * created or edited themselves (editing a demo record through the UI
 * re-stamps it with the current source, i.e. it "graduates" out of demo
 * data — see BaseRepository._stamp).
 */
export async function deleteAllDemoData() {
  let deleted = 0;

  for (const entityType of KNOWN_ENTITY_TYPES) {
    const repo = new EntityRepository(entityType);
    const all = await repo.findAll({ includeDeleted: true });
    for (const record of all) {
      if (record.source === 'DEMO_SEED') {
        await repo.hardDelete(record.id);
        deleted++;
      }
    }
  }

  const tasks = await taskRepository.findAll({ includeDeleted: true });
  for (const task of tasks) {
    if (task.source === 'DEMO_SEED') {
      await taskRepository.hardDelete(task.id);
      deleted++;
    }
  }

  const notifications = await dataProvider.getAll('notifications');
  for (const n of notifications) {
    if (n.source === 'DEMO_SEED') {
      await dataProvider.delete('notifications', n.id);
      deleted++;
    }
  }

  await logAudit('DELETE', 'demo-data', `Deleted ${deleted} demo record(s)`);
  return deleted;
}

/**
 * Resets demo data to a clean, consistent state: deletes any existing
 * DEMO_SEED-tagged records first (so clicking this twice never duplicates
 * anything), then re-runs every registered seeder.
 */
export async function reseedDemoData() {
  const deleted = await deleteAllDemoData();
  const users = await ensureUsers();
  await runSeedPass(users);
  await settingsRepository.set('DEMO_DATA_SEEDED', true);
  await logAudit('IMPORT', 'demo-data', `Reloaded demo data (removed ${deleted} old record(s) first)`);
}
