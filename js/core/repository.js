import { dataProvider } from './indexedDbProvider.js';
import { uuid, nowIso } from './uuid.js';
import { getCurrentUser } from './session.js';
import { isSeeding } from './seedContext.js';

/**
 * BaseRepository is the ONLY layer allowed to talk to the DataProvider.
 * Every module-specific repository extends this. It applies the common
 * Supabase-ready fields (id, timestamps, owner, visibility, soft delete)
 * uniformly so no module has to reinvent them.
 */
export class BaseRepository {
  constructor(storeName) {
    this.storeName = storeName;
  }

  _stamp(existing, patch, isCreate) {
    const user = getCurrentUser();
    const ts = nowIso();
    const base = isCreate
      ? {
          id: uuid(),
          created_at: ts,
          created_by: user ? user.id : null,
          owner_id: user ? user.id : null,
          visibility: 'PRIVATE',
          source: isSeeding() ? 'DEMO_SEED' : 'MANUAL',
          external_id: null,
          sync_status: 'LOCAL',
          deleted_at: null,
        }
      : { ...existing };
    return {
      ...base,
      ...patch,
      updated_at: ts,
      updated_by: user ? user.id : null,
    };
  }

  async create(patch) {
    const record = this._stamp(null, patch, true);
    await dataProvider.put(this.storeName, record);
    return record;
  }

  async update(id, patch) {
    const existing = await dataProvider.get(this.storeName, id);
    if (!existing) throw new Error(`${this.storeName}: record ${id} not found`);
    const record = this._stamp(existing, patch, false);
    await dataProvider.put(this.storeName, record);
    return record;
  }

  async upsert(patch) {
    if (patch.id) {
      const existing = await dataProvider.get(this.storeName, patch.id);
      if (existing) return this.update(patch.id, patch);
    }
    return this.create(patch);
  }

  async getById(id) {
    const record = await dataProvider.get(this.storeName, id);
    if (!record || record.deleted_at) return null;
    return record;
  }

  async softDelete(id) {
    return this.update(id, { deleted_at: nowIso() });
  }

  async restore(id) {
    return this.update(id, { deleted_at: null });
  }

  async hardDelete(id) {
    return dataProvider.delete(this.storeName, id);
  }

  async findAll({ includeDeleted = false } = {}) {
    const all = await dataProvider.getAll(this.storeName);
    return includeDeleted ? all : all.filter((r) => !r.deleted_at);
  }

  async count() {
    return (await this.findAll()).length;
  }

  async clearAll() {
    return dataProvider.clearStore(this.storeName);
  }
}
