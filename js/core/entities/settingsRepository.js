import { dataProvider } from '../indexedDbProvider.js';

// Key/value settings store (id = setting key). No governance fields needed.
class SettingsRepository {
  async get(id, fallback = null) {
    const record = await dataProvider.get('settings', id);
    return record ? record.value : fallback;
  }

  async set(id, value) {
    const record = { id, value };
    await dataProvider.put('settings', record);
    return record;
  }
}

export const settingsRepository = new SettingsRepository();
