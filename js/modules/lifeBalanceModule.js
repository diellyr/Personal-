import { h, clear } from '../ui/dom.js';
import { EntityRepository } from '../core/entityRepository.js';
import { listAllTasks } from '../core/tasks.js';
import { sectionTitle, statTile, emptyState } from '../ui/components/misc.js';
import { radarChart } from '../ui/components/chart.js';
import { daysBetween, todayIso } from '../core/dateUtils.js';

async function count(entityType) {
  try { return (await new EntityRepository(entityType).findAll()).length; } catch { return 0; }
}

export async function render(container, ctx) {
  clear(container);
  container.appendChild(h('h1', {}, '⚖️ Life Balance Intelligence'));
  container.appendChild(h('p', {}, 'Cruza Work, Family, Church, Studies, English, Leisure, Health e Projects. Não é um score moral — o objetivo é detectar desequilíbrio.'));

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

  container.appendChild(sectionTitle('📡 Radar de equilíbrio (últimos 30 dias, volume relativo)'));
  container.appendChild(h('div', { class: 'card' }, radarChart(normalized.map((d) => ({ label: d.label, value: d.norm })))));

  container.appendChild(sectionTitle('🔎 Leitura'));
  const avg = normalized.reduce((a, d) => a + d.norm, 0) / normalized.length;
  const high = normalized.filter((d) => d.norm > avg + 25);
  const low = normalized.filter((d) => d.norm < avg - 25);
  if (!high.length && !low.length) {
    container.appendChild(emptyState({ icon: '⚖️', title: 'Distribuição relativamente equilibrada', message: 'Nenhuma área muito acima ou abaixo das demais.' }));
  } else {
    high.forEach((d) => container.appendChild(h('div', { class: 'insight-card WARNING' }, [h('div', { class: 'insight-title' }, `${d.label} está desproporcionalmente ALTO`), h('div', { class: 'muted' }, 'Consuma consciente — verifique custo de oportunidade sobre as demais áreas.')])));
    low.forEach((d) => container.appendChild(h('div', { class: 'insight-card OPPORTUNITY' }, [h('div', { class: 'insight-title' }, `${d.label} está desproporcionalmente BAIXO`), h('div', { class: 'muted' }, 'Pode estar sendo negligenciado nas últimas semanas.')])));
  }
}

async function computeEnglishMinutes() {
  try {
    const sessions = await new EntityRepository('english.session').findAll();
    const today = todayIso();
    return sessions.filter((s) => daysBetween(s.data.date || today, today) <= 30).reduce((a, s) => a + (Number(s.data.durationMinutes) || 0), 0);
  } catch { return 0; }
}

async function countActive(entityType) {
  try {
    const all = await new EntityRepository(entityType).findAll();
    return all.filter((a) => a.data.status === 'ACTIVE').length;
  } catch { return 0; }
}
