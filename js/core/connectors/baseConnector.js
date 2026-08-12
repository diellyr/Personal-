import { Connector } from './connector.js';
import { connectorMetaRepository } from '../entities/connectorMetaRepository.js';
import { EntityRepository } from '../entityRepository.js';
import { logAudit } from '../audit.js';
import { uuid } from '../uuid.js';

/**
 * Shared behavior for file/mock-based connectors: dedup by external_id,
 * upsert into the target entityType, track status in connectors_meta, and
 * write an INTEGRATION audit entry. Concrete connectors only need to
 * provide `id`, `label`, `entityType`, `mapRecord(raw)` and `demoDataset()`.
 */
export class BaseConnector extends Connector {
  constructor(entityType) {
    super();
    this.entityType = entityType;
    this.repo = new EntityRepository(entityType);
  }

  mapRecord(raw) {
    return raw;
  }

  demoDataset() {
    return [];
  }

  async connect(config = {}) {
    await connectorMetaRepository.setConfig(this.id, config);
    const meta = await connectorMetaRepository.get(this.id);
    return { ...meta, status: 'CONNECTED' };
  }

  async disconnect() {
    const meta = (await connectorMetaRepository.get(this.id)) || { id: this.id };
    await connectorMetaRepository.setConfig(this.id, { ...meta.config });
    meta.status = 'DISCONNECTED';
    return meta;
  }

  async validate(rawRecords) {
    const errors = [];
    if (!Array.isArray(rawRecords)) errors.push('Formato inválido: esperado uma lista de registros.');
    return { valid: errors.length === 0, errors, count: Array.isArray(rawRecords) ? rawRecords.length : 0 };
  }

  async preview(rawRecords) {
    const existing = await this.repo.findAll({ includeDeleted: true });
    const existingExternalIds = new Set(existing.map((r) => r.external_id).filter(Boolean));
    return rawRecords.map((raw) => {
      const mapped = this.mapRecord(raw);
      const externalId = mapped.externalId || raw.id || raw.externalId || uuid();
      return { raw, mapped, externalId, isDuplicate: existingExternalIds.has(String(externalId)) };
    });
  }

  async import(rawRecords, { onProgress, sourceOverride } = {}) {
    const previewed = await this.preview(rawRecords);
    let imported = 0;
    const errors = [];
    let processed = 0;
    for (const item of previewed) {
      processed++;
      if (item.isDuplicate) {
        if (onProgress) onProgress(processed, previewed.length);
        continue;
      }
      try {
        const { externalId, ...data } = item.mapped;
        await this.repo.create(data, { source: sourceOverride || this.id.toUpperCase(), external_id: String(item.externalId), sync_status: 'SYNCED' });
        imported++;
      } catch (err) {
        errors.push(err.message);
      }
      if (onProgress) onProgress(processed, previewed.length);
    }
    await connectorMetaRepository.recordImport(this.id, { recordsImported: imported, errors });
    await logAudit('INTEGRATION', this.entityType, `${this.label}: imported ${imported} record(s), ${previewed.length - imported} duplicate/skip`);
    return { imported, skipped: previewed.length - imported, errors };
  }

  // Tagged distinctly from a real file import (source: 'DEMO_SEED' instead
  // of this.id.toUpperCase()) so "Excluir dados demo" in Backup & Restore
  // — which matches strictly on that tag — can find and remove it. Before
  // this, demo-dataset imports were indistinguishable from a real import
  // through the same connector and survived the demo-data cleanup.
  async importDemoDataset() {
    return this.import(this.demoDataset(), { sourceOverride: 'DEMO_SEED' });
  }

  async sync() {
    // No live API in this phase — sync() re-imports the last-known dataset
    // shape so the seam is exercised without inventing fake network calls.
    return this.importDemoDataset();
  }

  async getStatus() {
    const meta = await connectorMetaRepository.get(this.id);
    return meta || { id: this.id, status: 'DISCONNECTED', totalRecordsImported: 0 };
  }
}
