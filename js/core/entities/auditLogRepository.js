import { dataProvider } from '../indexedDbProvider.js';
import { uuid, nowIso } from '../uuid.js';

// Audit log is append-only: no update/soft-delete semantics from BaseRepository apply.
class AuditLogRepository {
  async append(entry) {
    const record = { id: uuid(), timestamp: nowIso(), ...entry };
    await dataProvider.put('audit_log', record);
    return record;
  }

  async findAll() {
    const all = await dataProvider.getAll('audit_log');
    return all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }

  async findByUser(userId) {
    return dataProvider.getAllByIndex('audit_log', 'userId', userId);
  }
}

export const auditLogRepository = new AuditLogRepository();
