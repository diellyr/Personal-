import { EntityRepository } from '../entityRepository.js';
import { todayIso, daysBetween } from '../dateUtils.js';
import { notifyOnce, SEVERITY } from '../notifications.js';

async function safeFindAll(entityType) {
  try {
    return await new EntityRepository(entityType).findAll();
  } catch {
    return [];
  }
}

/**
 * CrossModuleInsightService: rules that only make sense when reading two
 * or more modules together (section 96 of the product spec). Each rule
 * is isolated in try/catch so a missing/empty module never breaks the
 * others. Rules both return insight objects (for AI Insights screen) and
 * push into the Notification Center via notifyOnce (idempotent).
 */
export async function generateCrossModuleInsights() {
  const insights = [];
  const push = async (severity, module, title, message, dedupeKey) => {
    insights.push({ severity, module, title, message });
    try {
      await notifyOnce({ userId: 'ALL', module, severity, title, message, dedupeKey: `xmod:${dedupeKey}` });
    } catch { /* notifications are best-effort */ }
  };
  const today = todayIso();

  // FINANCE + TRAVEL
  try {
    const trips = (await safeFindAll('travel.trip')).filter((t) => t.data.status !== 'DONE' && t.data.status !== 'CANCELED');
    for (const trip of trips) {
      const planned = Number(trip.data.plannedBudget || 0);
      const actual = Number(trip.data.actualCost || 0);
      if (planned > 0 && actual > planned) {
        await push('WARNING', 'travel', `Viagem "${trip.data.destination}" acima do orçamento`,
          `Orçamento planejado: R$ ${planned.toFixed(2)} · custo atual: R$ ${actual.toFixed(2)}.`, `trip-budget-${trip.id}`);
      }
    }
  } catch { /* noop */ }

  // JOB + ENGLISH: interview tomorrow/soon with no prep session recently
  try {
    const interviews = await safeFindAll('jobs.interview');
    const englishSessions = await safeFindAll('english.session');
    const upcoming = interviews.filter((i) => i.data.date && daysBetween(today, i.data.date) >= 0 && daysBetween(today, i.data.date) <= 3 && i.data.status !== 'DONE');
    for (const interview of upcoming) {
      const recentPrep = englishSessions.some((s) => s.data.type === 'INTERVIEW' && daysBetween(s.data.date || today, today) <= 5);
      if (!recentPrep) {
        await push('CRITICAL', 'jobs', `Entrevista em breve sem preparação registrada`,
          `Entrevista com ${interview.data.company || 'empresa'} em ${interview.data.date}, mas nenhuma sessão de preparação (English/Interview Simulator) nos últimos 5 dias.`,
          `interview-prep-${interview.id}`);
      }
    }
  } catch { /* noop */ }

  // JOB + SKILLS (career): postings requiring skills with low evidence score
  try {
    const postings = (await safeFindAll('jobs.posting')).filter((p) => ['ANALYZED', 'APPROVED', 'APPLIED'].includes(p.data.status));
    const achievements = await safeFindAll('career.achievement');
    const skillMentions = {};
    achievements.forEach((a) => (a.data.competencies || []).forEach((c) => { skillMentions[c] = (skillMentions[c] || 0) + 1; }));
    for (const posting of postings) {
      const gapSkills = (posting.data.skills || []).filter((s) => !skillMentions[s]);
      if (gapSkills.length > 0) {
        await push('OPPORTUNITY', 'jobs', `Gap de evidências para "${posting.data.role}"`,
          `Sem achievements registrados para: ${gapSkills.join(', ')}. Considere registrar evidências no Career Vault antes de aplicar.`,
          `job-skillgap-${posting.id}`);
      }
    }
  } catch { /* noop */ }

  // CHURCH + CALENDAR: agenda item soon with no assigned responsible
  try {
    const agenda = await safeFindAll('church.agenda');
    const soon = agenda.filter((a) => a.data.date && daysBetween(today, a.data.date) >= 0 && daysBetween(today, a.data.date) <= 7);
    const missingOwner = soon.filter((a) => !a.data.responsible);
    if (missingOwner.length > 0) {
      await push('WARNING', 'church', `${missingOwner.length} evento(s) da igreja sem responsável definido`,
        `Nos próximos 7 dias: ${missingOwner.map((a) => a.data.title).join(', ')}.`, `church-noowner-${missingOwner.map((a) => a.id).join('-')}`);
    }
  } catch { /* noop */ }

  // FAMILY + CALENDAR: child events coming up soon
  try {
    const events = await safeFindAll('family.childEvent');
    const soon = events.filter((e) => e.data.date && daysBetween(today, e.data.date) >= 0 && daysBetween(today, e.data.date) <= 3);
    const byChild = {};
    soon.forEach((e) => { (byChild[e.data.childName] = byChild[e.data.childName] || []).push(e.data); });
    for (const [childName, list] of Object.entries(byChild)) {
      await push('INFO', 'family', `Compromisso(s) próximo(s) de ${childName}`,
        `${list.map((e) => `${e.title} (${e.date})`).join(', ')}.`, `family-child-event-${childName}`);
    }
  } catch { /* noop */ }

  // WORK + CAREER: heavy meeting load but no achievements logged this month
  try {
    const meetings = await safeFindAll('work.meeting');
    const achievements = await safeFindAll('career.achievement');
    const monthMeetings = meetings.filter((m) => (m.data.date || '').slice(0, 7) === today.slice(0, 7));
    const monthAchievements = achievements.filter((a) => (a.data.date || '').slice(0, 7) === today.slice(0, 7));
    if (monthMeetings.length >= 15 && monthAchievements.length === 0) {
      await push('WARNING', 'career', 'Muita atividade, pouca evidência de carreira',
        `${monthMeetings.length} reuniões este mês, mas nenhum achievement registrado no Career Vault. Considere transformar entregas recentes em evidências.`,
        `work-career-${today.slice(0, 7)}`);
    }
  } catch { /* noop */ }

  return insights;
}
