import { EntityRepository } from './entityRepository.js';
import { dataProvider } from './indexedDbProvider.js';
import { downloadJson, downloadBlob } from './backupService.js';
import { logAudit } from './audit.js';

// Known entity types across the app, used by Export Center / Data Management
// to enumerate everything without hardcoding a store per module (see
// docs/DATABASE.md for the full catalogue this mirrors).
export const KNOWN_ENTITY_TYPES = [
  'family.spouse', 'family.child', 'family.childEvent', 'family.parentCare', 'family.home', 'family.acompanhaEvent', 'family.schoolGrade',
  'church.role', 'church.person', 'church.agenda', 'church.sermon', 'church.project', 'church.followup', 'church.expansionEvent',
  'finance.transaction', 'finance.goal', 'finance.debt', 'finance.investment',
  'hobbies.item', 'travel.trip',
  'health.record',
  'work.activity',
  'career.achievement', 'career.objective',
  'jobs.posting', 'jobs.application', 'jobs.salaryInfo', 'jobs.interview',
  'english.session', 'english.mistake', 'english.selfAssessment',
  'studies.item',
  'crm.contact',
  'decisions.decision',
  'pains.pain',
  'ideas.idea',
  'memory.item',
  'projects.project',
  'goals.goal',
];

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set()));
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
}

function flatten(record) {
  return { id: record.id, ...record.data, visibility: record.visibility, owner_id: record.owner_id, created_at: record.created_at, updated_at: record.updated_at, deleted_at: record.deleted_at };
}

export async function exportEntityType(entityType, format = 'json', filters = {}) {
  const repo = new EntityRepository(entityType);
  let rows = await repo.findAll();
  if (filters.ownerId) rows = rows.filter((r) => r.owner_id === filters.ownerId);
  if (filters.fromDate) rows = rows.filter((r) => r.created_at >= filters.fromDate);
  if (filters.toDate) rows = rows.filter((r) => r.created_at <= filters.toDate);
  const flat = rows.map(flatten);
  const filename = `${entityType.replace('.', '-')}-${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === 'csv') downloadBlob(new Blob([toCsv(flat)], { type: 'text/csv' }), filename);
  else downloadJson(flat, filename);
  await logAudit('EXPORT', entityType, `Exported ${flat.length} record(s) as ${format}`);
  return flat.length;
}

export async function exportAllModules(format = 'json') {
  let total = 0;
  for (const entityType of KNOWN_ENTITY_TYPES) {
    const repo = new EntityRepository(entityType);
    const rows = await repo.findAll();
    if (rows.length) total += rows.length;
  }
  const full = {};
  for (const entityType of KNOWN_ENTITY_TYPES) {
    full[entityType] = (await new EntityRepository(entityType).findAll()).map(flatten);
  }
  const filename = `dielly-os-export-all-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJson(full, filename);
  await logAudit('EXPORT', 'all', `Exported all modules (${total} record(s))`);
  return total;
}

export async function importIntoEntityType(entityType, rows, { onProgress } = {}) {
  const repo = new EntityRepository(entityType);
  let imported = 0;
  for (const row of rows) {
    const { id, visibility, owner_id, created_at, updated_at, deleted_at, ...data } = row;
    await repo.create(data, { visibility: visibility || 'PRIVATE' });
    imported++;
    if (onProgress) onProgress(imported, rows.length);
  }
  await logAudit('IMPORT', entityType, `Imported ${imported} record(s)`);
  return imported;
}
