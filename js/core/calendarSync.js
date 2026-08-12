import { settingsRepository } from './entities/settingsRepository.js';
import { icsCalendarConnector } from './connectors/icsCalendarConnector.js';

const CONFIG_KEY = 'CALENDAR_ICS_SYNC';

export async function getIcsSyncConfig() {
  return settingsRepository.get(CONFIG_KEY, { url: '', lastSyncAt: null, lastStatus: null, lastError: null, lastCount: 0 });
}

export async function setIcsSyncUrl(url) {
  const cfg = await getIcsSyncConfig();
  const next = { ...cfg, url };
  await settingsRepository.set(CONFIG_KEY, next);
  return next;
}

/** Fetches the configured feed URL live and imports whatever events come
 * back. Throws (with the fetch/HTTP error message) on failure — the
 * caller decides how to present that, since a CORS failure here looks
 * like a generic network error to fetch(), not a distinct error type. */
export async function syncIcsNow() {
  const cfg = await getIcsSyncConfig();
  if (!cfg.url) throw new Error('Nenhum link ICS configurado.');
  try {
    const rawEvents = await icsCalendarConnector.fetchFromUrl(cfg.url);
    const result = await icsCalendarConnector.import(rawEvents);
    await settingsRepository.set(CONFIG_KEY, { ...cfg, lastSyncAt: new Date().toISOString(), lastStatus: 'success', lastError: null, lastCount: result.imported });
    return result;
  } catch (err) {
    await settingsRepository.set(CONFIG_KEY, { ...cfg, lastSyncAt: new Date().toISOString(), lastStatus: 'error', lastError: err.message });
    throw err;
  }
}
