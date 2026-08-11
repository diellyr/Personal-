import { EntityRepository } from './entityRepository.js';
import { todayIso, daysBetween, startOfWeek, startOfMonth } from './dateUtils.js';
import { listByModule } from './tasks.js';

async function activities() {
  return new EntityRepository('work.activity').findAll();
}

export async function computeDailyBrief() {
  const today = todayIso();
  const all = await activities();
  const todays = all.filter((a) => a.data.date === today);
  const meetings = todays.filter((a) => a.data.kind === 'MEETING');
  const jira = all.filter((a) => a.data.kind === 'JIRA');
  const jiraOverdue = jira.filter((a) => a.data.dueDate && a.data.dueDate < today && a.data.status !== 'DONE');
  const meetingMinutes = meetings.reduce((acc, m) => acc + (Number(m.data.durationMinutes) || 0), 0);
  const deepWorkAvailable = Math.max(0, 8 * 60 - meetingMinutes);
  const workTasks = (await listByModule('work')).filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED');
  return { meetings, jiraOverdue, deepWorkAvailable, meetingMinutes, workTasks, todays };
}

export async function computeWeeklyReview() {
  const today = todayIso();
  const weekStart = startOfWeek(today);
  const all = await activities();
  const weekItems = all.filter((a) => a.data.date && a.data.date >= weekStart && a.data.date <= today);
  const meetings = weekItems.filter((a) => a.data.kind === 'MEETING');
  const deepWork = weekItems.filter((a) => a.data.kind === 'DEEPWORK');
  const delivered = weekItems.filter((a) => a.data.status === 'DONE');
  const totalMinutes = weekItems.reduce((acc, a) => acc + (Number(a.data.durationMinutes) || 0), 0);
  const meetingMinutes = meetings.reduce((acc, a) => acc + (Number(a.data.durationMinutes) || 0), 0);
  const deepWorkMinutes = deepWork.reduce((acc, a) => acc + (Number(a.data.durationMinutes) || 0), 0);

  const recommendations = [];
  if (meetingMinutes > deepWorkMinutes * 2 && meetingMinutes > 300) {
    recommendations.push('Reuniões ocuparam mais que o dobro do tempo de deep work esta semana. Considere bloquear janelas de foco.');
  }
  if (delivered.length === 0 && weekItems.length > 0) {
    recommendations.push('Nenhuma atividade marcada como concluída esta semana. Revise o status das atividades em aberto.');
  }
  if (weekItems.length === 0) {
    recommendations.push('Nenhuma atividade de trabalho registrada esta semana — considere importar do Corporate Collector.');
  }
  return { weekItems, meetings, deepWork, delivered, totalMinutes, meetingMinutes, deepWorkMinutes, recommendations };
}

export async function computeJiraDashboard() {
  const today = todayIso();
  const jira = (await activities()).filter((a) => a.data.kind === 'JIRA');
  return {
    total: jira.length,
    open: jira.filter((a) => a.data.status !== 'DONE'),
    done: jira.filter((a) => a.data.status === 'DONE'),
    overdue: jira.filter((a) => a.data.dueDate && a.data.dueDate < today && a.data.status !== 'DONE'),
    stale: jira.filter((a) => a.data.status !== 'DONE' && daysBetween(a.updated_at.slice(0, 10), today) > 10),
    byCategory: groupSum(jira, 'category'),
  };
}

export async function computeTimesheet(range = 'WEEK') {
  const today = todayIso();
  const from = range === 'DAY' ? today : range === 'WEEK' ? startOfWeek(today) : startOfMonth(today);
  const all = (await activities()).filter((a) => a.data.date && a.data.date >= from && a.data.date <= today);
  return { items: all, byCategory: groupSum(all, 'category'), byKind: groupSum(all, 'kind') };
}

function groupSum(items, key) {
  const map = {};
  items.forEach((a) => {
    const k = a.data[key] || 'Outros';
    map[k] = (map[k] || 0) + (Number(a.data.durationMinutes) || 0);
  });
  return Object.entries(map).map(([label, minutes]) => ({ label, value: Math.round(minutes / 60 * 10) / 10 }));
}
