import { dataProvider } from './indexedDbProvider.js';
import { storeNames, SCHEMA_VERSION } from './db.js';
import { nowIso } from './uuid.js';
import { logAudit } from './audit.js';
import { settingsRepository } from './entities/settingsRepository.js';

const BACKUP_REMINDER_KEY = 'LAST_BACKUP_AT';

export async function buildBackup() {
  const data = {};
  for (const store of storeNames()) {
    data[store] = await dataProvider.getAll(store);
  }
  return { schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(), data };
}

export async function exportBackupToFile() {
  const backup = await buildBackup();
  downloadJson(backup, `dielly-os-backup-${backup.exportedAt.slice(0, 10)}.json`);
  await settingsRepository.set(BACKUP_REMINDER_KEY, nowIso());
  await logAudit('BACKUP', 'admin', `Full backup exported (${Object.values(backup.data).reduce((a, arr) => a + arr.length, 0)} records)`);
  return backup;
}

export function validateBackup(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') errors.push('Arquivo inválido.');
  else {
    if (!obj.schemaVersion) errors.push('schemaVersion ausente.');
    if (!obj.data || typeof obj.data !== 'object') errors.push('Campo "data" ausente.');
    else {
      for (const store of storeNames()) {
        if (obj.data[store] && !Array.isArray(obj.data[store])) errors.push(`Store "${store}" deveria ser uma lista.`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function restoreBackup(obj, mode = 'MERGE') {
  const { valid, errors } = validateBackup(obj);
  if (!valid) throw new Error(`Backup inválido: ${errors.join(' ')}`);

  if (mode === 'REPLACE') {
    for (const store of storeNames()) await dataProvider.clearStore(store);
  }
  let count = 0;
  for (const store of storeNames()) {
    const rows = obj.data[store] || [];
    for (const row of rows) {
      await dataProvider.put(store, row);
      count++;
    }
  }
  await logAudit('RESTORE', 'admin', `Backup restored in ${mode} mode (${count} records)`);
  return { count, mode };
}

export async function getLastBackupAt() {
  return settingsRepository.get(BACKUP_REMINDER_KEY, null);
}

export function isBackupStale(lastBackupAt, days = 7) {
  if (!lastBackupAt) return true;
  const diffMs = Date.now() - new Date(lastBackupAt).getTime();
  return diffMs > days * 86400000;
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
