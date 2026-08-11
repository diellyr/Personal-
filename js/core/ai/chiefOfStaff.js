import { EntityRepository } from '../entityRepository.js';
import { listOpenTasks, listOverdueTasks } from '../tasks.js';
import { todayIso, daysBetween } from '../dateUtils.js';

/**
 * AI Chief of Staff: a local rule engine (today) behind the same
 * `generateInsight()`-shaped output an LLM-backed provider would produce
 * later (see js/core/ai/aiProvider.js). Reads across modules and returns
 * severity-tagged insights — never mutates data, never takes action.
 */
const SEV = { INFO: 'INFO', OPPORTUNITY: 'OPPORTUNITY', WARNING: 'WARNING', CRITICAL: 'CRITICAL' };

async function safeFindAll(entityType) {
  try {
    return await new EntityRepository(entityType).findAll();
  } catch {
    return [];
  }
}

export async function generateChiefOfStaffInsights() {
  const insights = [];
  const today = todayIso();

  // 1. Overdue tasks
  const overdue = await listOverdueTasks();
  if (overdue.length > 0) {
    insights.push({
      severity: overdue.length >= 5 ? SEV.CRITICAL : SEV.WARNING,
      module: 'tasks',
      title: `${overdue.length} tarefa(s) atrasada(s)`,
      message: `Você tem ${overdue.length} tarefa(s) com prazo vencido. Considere renegociar prazos ou concluí-las hoje.`,
    });
  }

  // 2. Open tasks by module — too much concentration in one area
  const openTasks = await listOpenTasks();
  const byModule = {};
  openTasks.forEach((t) => { byModule[t.module] = (byModule[t.module] || 0) + 1; });
  const total = openTasks.length;
  Object.entries(byModule).forEach(([mod, count]) => {
    if (total >= 8 && count / total > 0.6) {
      insights.push({
        severity: SEV.WARNING,
        module: mod,
        title: `Carga concentrada em "${mod}"`,
        message: `${count} de ${total} tarefas abertas (${Math.round((count / total) * 100)}%) estão em "${mod}". Outras áreas podem estar sendo negligenciadas.`,
      });
    }
  });

  // 3. Active projects vs. progress this week
  const projects = (await safeFindAll('projects.project')).filter((p) => p.data && p.data.status === 'ACTIVE');
  if (projects.length > 0) {
    const stalled = projects.filter((p) => {
      const updated = new Date(p.updated_at);
      return daysBetween(updated.toISOString().slice(0, 10), today) > 7;
    });
    if (stalled.length > 0) {
      insights.push({
        severity: SEV.WARNING,
        module: 'projects',
        title: `Você possui ${projects.length} projeto(s) ativo(s), mas ${stalled.length} sem atualização há mais de 7 dias`,
        message: `Projetos sem movimento: ${stalled.map((p) => p.data.name).join(', ')}.`,
      });
    }
  }
  if (projects.length >= 5) {
    insights.push({
      severity: SEV.WARNING,
      module: 'projects',
      title: 'Excesso de frentes abertas',
      message: `Você possui ${projects.length} projetos ativos simultaneamente. Considere não iniciar um novo até concluir ou pausar algum.`,
    });
  }

  // 4. English study time vs. declared priority goal
  const englishSessions = await safeFindAll('english.session');
  const thisWeekMinutes = englishSessions
    .filter((s) => daysBetween(s.data.date || today, today) <= 7)
    .reduce((acc, s) => acc + (Number(s.data.durationMinutes) || 0), 0);
  const englishGoals = (await safeFindAll('goals.goal')).filter((g) => (g.data.module || '').toLowerCase() === 'english' && g.data.period === 'WEEKLY');
  if (englishGoals.length > 0) {
    const target = Number(englishGoals[0].data.targetMinutes || 150);
    if (thisWeekMinutes < target * 0.5) {
      insights.push({
        severity: SEV.WARNING,
        module: 'english',
        title: 'Inglês abaixo da meta semanal',
        message: `Você declarou inglês como prioridade (meta ${target}min/semana), mas estudou apenas ${thisWeekMinutes}min esta semana.`,
      });
    }
  }

  // 5. Meeting load this week
  const meetings = await safeFindAll('work.meeting');
  const weekMeetings = meetings.filter((m) => daysBetween(m.data.date || today, today) <= 7 && daysBetween(m.data.date || today, today) >= 0);
  const meetingHours = weekMeetings.reduce((acc, m) => acc + (Number(m.data.durationMinutes) || 0) / 60, 0);
  if (meetingHours >= 12) {
    insights.push({
      severity: meetingHours >= 18 ? SEV.CRITICAL : SEV.WARNING,
      module: 'work',
      title: `Seu calendário tem ${meetingHours.toFixed(1)}h de reuniões nesta semana`,
      message: 'Pouco espaço restante para deep work. Considere recusar ou delegar reuniões não essenciais.',
    });
  }

  // 6. Family load imbalance signal (delegated to family module's own analyzer, surfaced here as summary)
  const familyTasksOpen = openTasks.filter((t) => t.module === 'family');
  if (familyTasksOpen.length === 0 && openTasks.length > 3) {
    insights.push({
      severity: SEV.OPPORTUNITY,
      module: 'family',
      title: 'Nenhuma tarefa familiar em aberto',
      message: 'Você tem tarefas em outras áreas, mas nenhuma para a família nesta semana. Vale revisar compromissos familiares.',
    });
  }

  // 7. Decisions pending review
  const decisions = await safeFindAll('decisions.decision');
  const dueReview = decisions.filter((d) => d.data.reviewDate && d.data.reviewDate <= today && !d.data.actualResult);
  if (dueReview.length > 0) {
    insights.push({
      severity: SEV.INFO,
      module: 'decisions',
      title: `${dueReview.length} decisão(ões) prontas para revisão`,
      message: 'Registrar o resultado real ajuda a calibrar decisões futuras.',
    });
  }

  if (insights.length === 0) {
    insights.push({ severity: SEV.INFO, module: 'general', title: 'Tudo sob controle', message: 'Nenhum ponto de atenção crítico detectado no momento.' });
  }

  return insights;
}
