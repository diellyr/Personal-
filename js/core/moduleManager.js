import { settingsRepository } from './entities/settingsRepository.js';

const KEY = 'DISABLED_MODULES';
let cache = null;

export async function getDisabledModules() {
  if (cache) return cache;
  cache = await settingsRepository.get(KEY, []);
  return cache;
}

export async function isModuleEnabled(moduleKey) {
  const disabled = await getDisabledModules();
  return !disabled.includes(moduleKey);
}

export async function setModuleEnabled(moduleKey, enabled) {
  const disabled = await getDisabledModules();
  const next = enabled ? disabled.filter((k) => k !== moduleKey) : [...new Set([...disabled, moduleKey])];
  await settingsRepository.set(KEY, next);
  cache = next;
  return next;
}
