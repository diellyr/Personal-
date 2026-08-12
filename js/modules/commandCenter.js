import { h, clear, fmtDate } from '../ui/dom.js';
import { todayIso, daysBetween, startOfWeek, startOfMonth } from '../core/dateUtils.js';
import { listOpenTasks, listOverdueTasks } from '../core/tasks.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { generateChiefOfStaffInsights } from '../core/ai/chiefOfStaff.js';
import { generateCrossModuleInsights } from '../core/ai/crossModuleInsights.js';
import { severityBadge, statTile, sectionTitle, badge } from '../ui/components/misc.js';
import { navigate } from '../core/router.js';
import { t, getLanguage } from '../core/i18n.js';

async function safeFindAll(entityType, user) {
  try {
    const all = await new EntityRepository(entityType).findAll();
    return user ? all.filter((r) => canViewResource(user, r)) : all;
  } catch {
    return [];
  }
}

const RANGE_DAYS = { HOJE: 1, SEMANA: 7, MÊS: 30 };

export async function render(container, ctx) {
  const { user } = ctx;
  const state = { range: 'HOJE' };
  clear(container);
  const root = h('div', {});
  container.appendChild(root);
  await paint();

  async function paint() {
    clear(root);
    const today = todayIso();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? t('cc.greetingMorning') : hour < 18 ? t('cc.greetingAfternoon') : t('cc.greetingEvening');
    const rangeLabels = { HOJE: t('cc.rangeToday'), SEMANA: t('cc.rangeWeek'), MÊS: t('cc.rangeMonth') };
    const dateLocale = getLanguage() === 'en' ? 'en-US' : 'pt-BR';

    root.appendChild(h('div', { class: 'flex-between', style: 'margin-bottom:18px' }, [
      h('div', {}, [
        h('h1', {}, `${greeting}, ${user.displayName} 👋`),
        h('p', {}, new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })),
      ]),
      h('div', { class: 'tabs', style: 'border:none;margin:0' }, Object.keys(RANGE_DAYS).map((r) =>
        h('div', { class: `tab ${state.range === r ? 'active' : ''}`, onClick: () => { state.range = r; paint(); } }, rangeLabels[r]))),
    ]));

    const rangeDays = RANGE_DAYS[state.range];
    const inRange = (dateStr) => dateStr && daysBetween(today, dateStr) >= (state.range === 'HOJE' ? -0 : -rangeDays + 1) && daysBetween(today, dateStr) <= rangeDays - (state.range === 'HOJE' ? 0 : 0) && daysBetween(today, dateStr) >= 0 && daysBetween(today, dateStr) < rangeDays;

    const [openTasks, overdue, notifsSources, familyChildren, churchAgenda, jobInterviews, trips, financeTx, englishSessions, studies, decisions] = await Promise.all([
      listOpenTasks(), listOverdueTasks(),
      Promise.resolve([]),
      safeFindAll('family.child', user),
      safeFindAll('church.agenda', user),
      safeFindAll('jobs.interview', user),
      safeFindAll('travel.trip', user),
      safeFindAll('finance.transaction', user),
      safeFindAll('english.session', user),
      safeFindAll('studies.item', user),
      safeFindAll('decisions.decision', user),
    ]);

    const priorityScore = (tk) => ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[tk.priority] || 2) + (tk.dueDate && tk.dueDate <= today ? 5 : 0);
    const top3 = [...openTasks].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 3);

    // ---- Foco do dia + Top priorities ----
    root.appendChild(sectionTitle(t('cc.focusToday')));
    root.appendChild(h('div', { class: 'grid grid-3' }, top3.length ? top3.map((tk) => h('div', { class: 'card' }, [
      h('div', { class: 'flex-between' }, [h('strong', {}, tk.title), badge(tk.priority, tk.priority === 'CRITICAL' ? 'critical' : tk.priority === 'HIGH' ? 'warning' : 'neutral')]),
      h('p', { style: 'margin-top:6px' }, `${t('cc.module')}: ${tk.module}${tk.dueDate ? ' · ' + t('cc.deadline') + ': ' + fmtDate(tk.dueDate) : ''}`),
    ])) : [h('div', { class: 'card muted' }, t('cc.noOpenTasks'))]));

    // ---- Indicators ----
    root.appendChild(sectionTitle(t('cc.indicators')));
    const weekEnglishMin = englishSessions.filter((s) => daysBetween(s.data.date || today, today) <= 7).reduce((a, s) => a + (Number(s.data.durationMinutes) || 0), 0);
    const balance = financeTx.reduce((acc, tx) => acc + (tx.data.type === 'INCOME' ? Number(tx.data.amount || 0) : -Number(tx.data.amount || 0)), 0);
    root.appendChild(h('div', { class: 'grid grid-4' }, [
      statTile(t('cc.openTasks'), openTasks.length, overdue.length ? t('cc.overdueCount', { n: overdue.length }) : t('cc.upToDate')),
      statTile(t('cc.childrenRegistered'), familyChildren.length, 'Family'),
      statTile(t('cc.financeBalance'), balance.toLocaleString(dateLocale, { style: 'currency', currency: 'BRL' }), 'Finance'),
      statTile(t('cc.englishWeek'), `${weekEnglishMin} min`, 'English'),
    ]));

    // ---- Agenda ----
    root.appendChild(sectionTitle(t('cc.agenda', { range: rangeLabels[state.range] })));
    const agendaItems = [
      ...openTasks.filter((tk) => tk.dueDate && inRange(tk.dueDate)).map((tk) => ({ date: tk.dueDate, title: tk.title, source: 'Task', module: tk.module })),
      ...churchAgenda.filter((a) => inRange(a.data.date)).map((a) => ({ date: a.data.date, title: a.data.title, source: 'Church', module: 'church' })),
      ...jobInterviews.filter((i) => inRange(i.data.date)).map((i) => ({ date: i.data.date, title: t('cc.interview', { company: i.data.company || '' }), source: 'Job Hunter', module: 'jobs' })),
      ...trips.filter((tr) => inRange(tr.data.startDate)).map((tr) => ({ date: tr.data.startDate, title: t('cc.trip', { destination: tr.data.destination }), source: 'Travel', module: 'hobbies-travel' })),
    ].sort((a, b) => (a.date < b.date ? -1 : 1));
    root.appendChild(agendaItems.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
          h('thead', {}, h('tr', {}, [h('th', {}, t('cc.colDate')), h('th', {}, t('cc.colItem')), h('th', {}, t('cc.colSource'))])),
          h('tbody', {}, agendaItems.map((it) => h('tr', {}, [h('td', {}, fmtDate(it.date)), h('td', {}, it.title), h('td', {}, badge(it.source, 'neutral'))]))),
        ]))
      : h('div', { class: 'card muted' }, t('cc.nothingScheduled')));

    // ---- AI Insights preview ----
    const [coS, xmod] = await Promise.all([generateChiefOfStaffInsights(), generateCrossModuleInsights()]);
    const combined = [...coS, ...xmod].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 4);
    root.appendChild(sectionTitle(t('cc.aiInsights'), h('button', { class: 'link-btn', onClick: () => navigate('/ai-insights') }, t('cc.viewAll'))));
    root.appendChild(h('div', {}, combined.map((i) => h('div', { class: `insight-card ${i.severity}` }, [
      h('div', { class: 'insight-title' }, i.title),
      h('div', { class: 'muted' }, i.message),
    ]))));
  }
}

function sevRank(s) {
  return { CRITICAL: 4, WARNING: 3, OPPORTUNITY: 2, INFO: 1 }[s] || 0;
}
