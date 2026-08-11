import { mockAIProvider } from './mockAIProvider.js';
import { settingsRepository } from '../entities/settingsRepository.js';

const AI_SETTINGS_KEY = 'AI_SETTINGS';

export async function getAiSettings() {
  return settingsRepository.get(AI_SETTINGS_KEY, {
    provider: 'MOCK',
    model: 'local-rules-v1',
    apiKeyMasked: null,
    hasApiKey: false,
    temperature: 0.4,
    status: 'ACTIVE',
  });
}

export async function saveAiSettings({ provider, model, apiKey, temperature }) {
  const current = await getAiSettings();
  const next = {
    ...current,
    provider: provider || current.provider,
    model: model || current.model,
    temperature: temperature ?? current.temperature,
  };
  if (apiKey) {
    // Never persist the raw key in the clear beyond this call, and never
    // show it again in full — only a masked tail, consistent with rule
    // 93. IndexedDB has no server-grade secret storage, so this is
    // explicitly a placeholder until Supabase-backed secret storage
    // (see docs/SECURITY.md).
    next.apiKeyMasked = `••••••••${apiKey.slice(-4)}`;
    next.hasApiKey = true;
  }
  await settingsRepository.set(AI_SETTINGS_KEY, next);
  return next;
}

// Only MOCK is implemented today. OPENAI / CLAUDE / GEMINI are reserved
// provider ids the Owner can select, but resolving to mock keeps the app
// fully functional offline until real credentials + a provider class are
// wired in (see docs/AI_ARCHITECTURE.md).
export async function getActiveAiProvider() {
  return mockAIProvider;
}
