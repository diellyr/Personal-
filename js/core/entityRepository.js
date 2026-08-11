import { BaseRepository } from './repository.js';
import { dataProvider } from './indexedDbProvider.js';

/**
 * EntityRepository scopes the shared polymorphic `records` IndexedDB store
 * to a single logical collection (`entityType`), e.g. 'family.child' or
 * 'finance.transaction'. Domain-specific fields live under `data`; common
 * governance fields (owner, visibility, timestamps, soft delete...) live at
 * the top level via BaseRepository.
 *
 * Why one shared store instead of one IndexedDB object store per entity:
 * it lets 80+ entity types share one generic CRUD/query/visibility engine
 * instead of duplicating it 80+ times, while remaining trivially mappable
 * to individual Postgres tables at Supabase migration time (see
 * docs/MIGRATION_TO_SUPABASE.md) — entityType becomes the table name.
 */
export class EntityRepository extends BaseRepository {
  constructor(entityType) {
    super('records');
    this.entityType = entityType;
  }

  async create(data, patch = {}) {
    return super.create({ entityType: this.entityType, data, ...patch });
  }

  async update(id, data, patch = {}) {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`${this.entityType}: record ${id} not found`);
    const mergedData = { ...existing.data, ...data };
    return super.update(id, { data: mergedData, ...patch });
  }

  async findAll({ includeDeleted = false } = {}) {
    const all = await dataProvider.getAllByIndex('records', 'entityType', this.entityType);
    return includeDeleted ? all : all.filter((r) => !r.deleted_at);
  }

  async count() {
    return (await this.findAll()).length;
  }
}
