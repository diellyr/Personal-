import { EntityRepository } from './entityRepository.js';
import { todayIso, daysBetween } from './dateUtils.js';

/** People Attention Radar, Leadership Load, Ministry Health — Church Intelligence (section 16). */
export async function computeChurchIntelligence() {
  const today = todayIso();
  const [followups, roles, projects, agenda, people] = await Promise.all([
    new EntityRepository('church.followup').findAll(),
    new EntityRepository('church.role').findAll(),
    new EntityRepository('church.project').findAll(),
    new EntityRepository('church.agenda').findAll(),
    new EntityRepository('church.person').findAll(),
  ]);

  const overdueFollowups = followups.filter((f) => f.data.status !== 'CONCLUIDO' && f.data.date && f.data.date < today);
  const staleFollowups = followups.filter((f) => f.data.status !== 'CONCLUIDO' && daysBetween(f.updated_at.slice(0, 10), today) > 21);
  const peopleAttentionRadar = [...new Set([...overdueFollowups, ...staleFollowups].map((f) => f.data.personName))];

  const activeRoles = roles.filter((r) => r.data.active);
  const loadByPerson = {};
  activeRoles.forEach((r) => { loadByPerson[r.data.holder || 'Sem responsável'] = (loadByPerson[r.data.holder || 'Sem responsável'] || 0) + 1; });
  const leadershipLoad = Object.entries(loadByPerson).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const activeProjects = projects.filter((p) => p.data.status === 'EM_ANDAMENTO' || p.data.status === 'PLANEJADO');
  const stalledProjects = activeProjects.filter((p) => daysBetween(p.updated_at.slice(0, 10), today) > 14);
  const ministryHealth = {
    activeProjects: activeProjects.length,
    stalledProjects: stalledProjects.length,
    upcomingEvents: agenda.filter((a) => a.data.date >= today && daysBetween(today, a.data.date) <= 14).length,
    totalPeople: people.length,
  };

  return { peopleAttentionRadar, overdueFollowups, leadershipLoad, ministryHealth, stalledProjects };
}
