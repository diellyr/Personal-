import { EntityRepository } from './entityRepository.js';
import { listAllTasks } from './tasks.js';
import { daysBetween, todayIso } from './dateUtils.js';

async function count(entityType) {
  try { return (await new EntityRepository(entityType).findAll()).length; } catch { return 0; }
}

async function countActive(entityType) {
  try {
    const all = await new EntityRepository(entityType).findAll();
    return all.filter((a) => a.data.status === 'ACTIVE').length;
  } catch { return 0; }
}

async function computeEnglishMinutes() {
  try {
    const sessions = await new EntityRepository('english.session').findAll();
    const today = todayIso();
    return sessions.filter((s) => daysBetween(s.data.date || today, today) <= 30).reduce((a, s) => a + (Number(s.data.durationMinutes) || 0), 0);
  } catch { return 0; }
}

/**
 * Life Balance Intelligence (section 61): relative activity volume across
 * Work/Family/Church/Studies/English/Leisure/Health/Projects over the last
 * 30 days, normalized 0-100 against whichever dimension has the most
 * volume. Explicitly NOT a moral score — just a radar for spotting
 * over/under-indexed areas. Shared by the Life Balance module and the
 * central Dashboards module so the math lives in exactly one place.
 */
export async function computeLifeBalance() {
  const today = todayIso();
  const tasks = await listAllTasks();
  const recentTasks = tasks.filter((t) => daysBetween(t.updated_at ? t.updated_at.slice(0, 10) : today, today) <= 30);
  const byModule = {};
  recentTasks.forEach((t) => { byModule[t.module] = (byModule[t.module] || 0) + 1; });

  const [workActs, englishMin, hobbies, health, churchAgenda, projects] = await Promise.all([
    count('work.activity'), computeEnglishMinutes(), count('hobbies.item'), count('health.record'), count('church.agenda'), countActive('projects.project'),
  ]);

  const dims = [
    { label: 'Work', value: (byModule.work || 0) + workActs },
    { label: 'Family', value: byModule.family || 0 },
    { label: 'Church', value: (byModule.church || 0) + churchAgenda },
    { label: 'Studies', value: byModule.studies || 0 },
    { label: 'English', value: Math.round(englishMin / 30) },
    { label: 'Leisure', value: hobbies },
    { label: 'Health', value: health },
    { label: 'Projects', value: (byModule.projects || 0) + projects },
  ];
  const max = Math.max(1, ...dims.map((d) => d.value));
  const normalized = dims.map((d) => ({ ...d, norm: Math.round((d.value / max) * 100) }));
  const avg = normalized.reduce((a, d) => a + d.norm, 0) / normalized.length;
  const high = normalized.filter((d) => d.norm > avg + 25);
  const low = normalized.filter((d) => d.norm < avg - 25);

  return { normalized, high, low };
}
