import { dataProvider } from '../indexedDbProvider.js';
import { nowIso } from '../uuid.js';

// One row per connector id (e.g. 'acompanha-plus'). Tracks operational state.
class ConnectorMetaRepository {
  async get(connectorId) {
    return dataProvider.get('connectors_meta', connectorId);
  }

  async getAll() {
    return dataProvider.getAll('connectors_meta');
  }

  async recordImport(connectorId, { recordsImported, errors = [] }) {
    const existing = (await this.get(connectorId)) || {
      id: connectorId,
      status: 'DISCONNECTED',
      config: {},
      totalRecordsImported: 0,
    };
    const updated = {
      ...existing,
      status: errors.length ? 'ERROR' : 'CONNECTED',
      lastImportAt: nowIso(),
      lastImportRecords: recordsImported,
      totalRecordsImported: (existing.totalRecordsImported || 0) + recordsImported,
      lastError: errors.length ? errors.join('; ') : null,
    };
    await dataProvider.put('connectors_meta', updated);
    return updated;
  }

  async setConfig(connectorId, config) {
    const existing = (await this.get(connectorId)) || { id: connectorId, status: 'DISCONNECTED', totalRecordsImported: 0 };
    const updated = { ...existing, config: { ...existing.config, ...config } };
    await dataProvider.put('connectors_meta', updated);
    return updated;
  }
}

export const connectorMetaRepository = new ConnectorMetaRepository();
