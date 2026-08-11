import { EntityRepository } from './entityRepository.js';
import { KNOWN_ENTITY_TYPES } from './exportImportService.js';
import { taskRepository } from './entities/taskRepository.js';
import { logAudit } from './audit.js';

/**
 * Backs Admin -> Data Management's "Apagar dados de todos os módulos"
 * button — the bulk counterpart to the existing per-module "Limpar
 * módulo" button, applied to every entityType (and Tasks, since every
 * task belongs to a module) in one pass. Soft delete, same as clearing a
 * single module, so it's recoverable via Backup & Restore if a backup
 * exists. Deliberately does NOT touch: users, settings,
 * permissions_overrides, connectors_meta, or audit_log — those are
 * system/account state, not module data, and audit_log in particular
 * must survive so this action itself remains reviewable.
 */
export async function clearAllModulesData() {
  let cleared = 0;

  for (const entityType of KNOWN_ENTITY_TYPES) {
    const repo = new EntityRepository(entityType);
    const all = await repo.findAll();
    for (const record of all) {
      await repo.softDelete(record.id);
      cleared++;
    }
  }

  const tasks = await taskRepository.findAll();
  for (const task of tasks) {
    await taskRepository.softDelete(task.id);
    cleared++;
  }

  await logAudit('DELETE', 'all-modules', `Cleared ${cleared} record(s) across all modules`);
  return cleared;
}
