/**
 * Connector interface (section 94/95 of the product spec). Every external
 * system (Acompanha+, Portal Expansão, Pluma, Corporate Collector, Job
 * Sources) implements this exact shape so the Integration Center can
 * treat them uniformly. Today every connector supports JSON/CSV
 * file-import and a bundled demo dataset; `sync()` is a placeholder seam
 * for a future live API without changing callers.
 */
export class Connector {
  id = 'base';
  label = 'Base Connector';

  async connect(config) { throw new Error('not implemented'); }
  async disconnect() { throw new Error('not implemented'); }
  async import(rawRecords) { throw new Error('not implemented'); }
  async sync() { throw new Error('not implemented'); }
  async validate(rawRecords) { throw new Error('not implemented'); }
  async getStatus() { throw new Error('not implemented'); }
}
