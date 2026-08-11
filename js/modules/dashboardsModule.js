import { h, clear, fmtMoney } from '../ui/dom.js';
import { sectionTitle, statTile, emptyState, badge } from '../ui/components/misc.js';
import { barChart, lineChart, radarChart } from '../ui/components/chart.js';
import { computeSpendingIntelligence, computeForecast, computeMonthlyBreakdown } from '../core/financeIntelligence.js';
import { computeTimesheet } from '../core/workIntelligence.js';
import { computeCareerEvidenceScores } from '../core/careerIntelligence.js';
import { computeEnglishDashboard } from '../core/englishIntelligence.js';
import { computeLifeBalance } from '../core/lifeBalanceIntelligence.js';
import { computeChurchIntelligence } from '../core/churchIntelligence.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource, can } from '../core/permissions.js';
import { navigate } from '../core/router.js';
import { listSchoolChildren, computeSchoolEvolution, summarizeComparison } from '../core/schoolIntelligence.js';
import { computeExpansionIntelligence } from '../core/expansionIntelligence.js';

/**
 * Central Dashboards: one screen that pulls the chart already built for
 * each module's own Intelligence tab (Finance, Work, Career, English, Life
 * Balance, Jobs, Church) into a single overview grid, instead of clicking
 * through 7 modules to see "how's everything going". Read-only — every
 * card links back to its module for the full drill-down.
 */
export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📊 Dashboards'));
  container.appendChild(h('p', {}, 'Visão consolidada de gráficos de vários módulos em um só lugar. Clique em "Abrir módulo" em qualquer card para o detalhe completo.'));

  const grid = h('div', { class: 'grid grid-2' });
  container.appendChild(h('div', { class: 'loading-spinner' }, 'Calculando…'));

  // Each card is gated by the same module permission its own screen uses —
  // Dashboards is a read-only aggregation view, not a permission bypass. A
  // user without VIEW on Jobs (e.g. FAMILY_ADMIN by default) won't see the
  // Jobs card here either, same as it's hidden from their sidebar.
  const [canFinance, canWork, canCareer, canEnglish, canIntelligence, canJobs, canChurch, canFamily] = await Promise.all([
    can(user, 'finance', 'VIEW'), can(user, 'work', 'VIEW'), can(user, 'career', 'VIEW'),
    can(user, 'english', 'VIEW'), can(user, 'intelligence', 'VIEW'), can(user, 'jobs', 'VIEW'), can(user, 'church', 'VIEW'),
    can(user, 'family', 'VIEW'),
  ]);

  const cardBuilders = [
    canFinance && financeCard,
    canFamily && acompanhaCard,
    canWork && workCard,
    canCareer && careerCard,
    canEnglish && englishCard,
    canIntelligence && lifeBalanceCard,
    canJobs && jobsCard,
    canChurch && churchCard,
    canChurch && expansionYouthCard,
  ].filter(Boolean);

  const cards = await Promise.all(cardBuilders.map((fn) => fn(user)));

  clear(container);
  container.appendChild(h('h1', {}, '📊 Dashboards'));
  container.appendChild(h('p', {}, 'Visão consolidada de gráficos de vários módulos em um só lugar. Clique em "Abrir módulo" em qualquer card para o detalhe completo.'));
  if (!cards.length) {
    container.appendChild(emptyState({ icon: '📊', title: 'Nenhum módulo com dados disponível', message: 'Seu perfil não tem acesso a módulos com dashboards ainda.' }));
    return;
  }
  cards.forEach((c) => grid.appendChild(c));
  container.appendChild(grid);
}

function cardShell(title, route, bodyNode, { clickable = false } = {}) {
  const card = h('div', { class: 'card', style: clickable ? 'cursor:pointer' : '' }, [
    h('div', { class: 'flex-between', style: 'margin-bottom:10px' }, [
      h('h3', { style: 'margin:0' }, title),
      h('button', { class: 'btn btn-sm', onClick: (e) => { e.stopPropagation(); navigate(`/${route}`); } }, 'Abrir módulo →'),
    ]),
    bodyNode,
  ]);
  if (clickable) card.addEventListener('click', () => navigate(`/${route}`));
  return card;
}

async function financeCard() {
  const [spending, forecast, breakdown] = await Promise.all([computeSpendingIntelligence(), computeForecast(), computeMonthlyBreakdown()]);
  const currentMonth = breakdown.months[new Date().getMonth()];
  const body = h('div', {}, [
    h('div', { class: 'grid grid-3', style: 'margin-bottom:10px' }, [
      statTile('Receitas (mês)', fmtMoney(currentMonth.income), null, 'success'),
      statTile('Despesas (mês)', fmtMoney(currentMonth.expense), null, 'critical'),
      statTile('Saldo (mês)', fmtMoney(currentMonth.net), null, currentMonth.net >= 0 ? 'info' : 'critical'),
    ]),
    spending.categories.length
      ? barChart(spending.categories.slice(0, 6), { height: 140, valueFmt: (v) => fmtMoney(v) })
      : emptyState({ icon: '💰', title: 'Sem despesas registradas' }),
    h('div', { class: 'muted', style: 'margin-top:6px' }, `Projeção 12 meses: ${fmtMoney(forecast.projection12)}`),
  ]);
  return cardShell(`💰 Financeiro — ${currentMonth.label}/${breakdown.year}`, 'finance', body, { clickable: true });
}

function deltaBadge(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return badge('—', 'neutral');
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return badge('= sem variação', 'neutral');
  return badge(`${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}`, diff >= 0 ? 'success' : 'critical');
}

// One card for all Acompanha+ School data — event log (acompanhaEvent) and
// grades (schoolGrade) are separate entity types with separate children
// sets (e.g. a child with only imported grades and no logged events), so a
// child could be entirely invisible if these were two separate cards.
async function acompanhaCard(user) {
  const events = (await new EntityRepository('family.acompanhaEvent').findAll()).filter((r) => canViewResource(user, r) && r.data.childName);
  const byChild = {};
  events.forEach((r) => { const c = r.data.childName; byChild[c] = (byChild[c] || 0) + 1; });
  const eventData = Object.entries(byChild).map(([label, value]) => ({ label, value }));
  const alerts = events.filter((r) => r.data.alert).length;

  const gradeChildren = await listSchoolChildren(user);
  const gradeRows = await Promise.all(gradeChildren.map(async (child) => {
    const ev = await computeSchoolEvolution(user, child);
    return { child, bimester: summarizeComparison(ev.bimesterComparison) };
  }));

  const parts = [];
  if (eventData.length) {
    parts.push(barChart(eventData, { height: 120, color: '#f59e0b' }));
    parts.push(h('div', { class: 'muted', style: 'margin:6px 0 12px' }, alerts ? `⚠️ ${alerts} alerta(s) ativo(s) entre os filhos acompanhados.` : '✅ Nenhum alerta ativo.'));
  }
  if (gradeRows.length) {
    parts.push(h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:4px' }, 'Notas — bimestre atual vs. anterior'));
    parts.push(h('div', {}, gradeRows.map((r) => h('div', { class: 'flex-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px' }, [
      h('span', {}, `${r.child}: ${r.bimester.currentAvg != null ? r.bimester.currentAvg.toFixed(1) : '—'}${r.bimester.previousAvg != null ? ` · anterior: ${r.bimester.previousAvg.toFixed(1)}` : ''}`),
      deltaBadge(r.bimester.currentAvg, r.bimester.previousAvg),
    ]))));
  }
  if (!parts.length) parts.push(emptyState({ icon: '🎓', title: 'Sem dados do Acompanha+ ainda' }));

  return cardShell('🎓 Acompanha+ School', 'acompanha-plus', h('div', {}, parts), { clickable: true });
}

async function workCard() {
  const timesheet = await computeTimesheet('MONTH');
  const body = timesheet.byCategory.length
    ? barChart(timesheet.byCategory, { height: 160, valueFmt: (v) => `${v}h`, color: '#0ea5a5' })
    : emptyState({ icon: '💼', title: 'Sem atividades de trabalho este mês' });
  return cardShell('💼 Trabalho — horas por categoria (mês)', 'work', body);
}

async function careerCard() {
  const scores = await computeCareerEvidenceScores();
  const body = scores.length
    ? barChart(scores.slice(0, 6).map((s) => ({ label: s.skill, value: s.score })), { height: 160, color: '#7c3aed' })
    : emptyState({ icon: '🚀', title: 'Sem achievements registrados' });
  return cardShell('🚀 Carreira — score por competência', 'career', body);
}

async function englishCard() {
  const dashboard = await computeEnglishDashboard();
  const body = radarChart(dashboard.dims.map((d) => ({ label: d.label, value: d.value })), { width: 280, height: 240 });
  return cardShell('🗣️ Inglês — radar de competências', 'english', body);
}

async function lifeBalanceCard() {
  const { normalized } = await computeLifeBalance();
  const body = radarChart(normalized.map((d) => ({ label: d.label, value: d.norm })), { width: 280, height: 240, color: '#0ea5a5' });
  return cardShell('⚖️ Life Balance — últimos 30 dias', 'life-balance', body);
}

async function jobsCard(user) {
  const all = (await new EntityRepository('jobs.posting').findAll()).filter((r) => canViewResource(user, r));
  const byStatus = {};
  all.forEach((r) => { const s = r.data.status || 'FOUND'; byStatus[s] = (byStatus[s] || 0) + 1; });
  const data = Object.entries(byStatus).map(([label, value]) => ({ label, value }));
  const body = data.length
    ? barChart(data, { height: 160, color: '#c2273d' })
    : emptyState({ icon: '🎯', title: 'Nenhuma vaga no pipeline' });
  return cardShell('🎯 Vagas — pipeline por etapa', 'jobs', body);
}

async function churchCard() {
  const intel = await computeChurchIntelligence();
  const body = h('div', {}, [
    h('div', { class: 'grid grid-2' }, [
      statTile('Projetos ativos', intel.ministryHealth.activeProjects),
      statTile('Eventos (14 dias)', intel.ministryHealth.upcomingEvents),
    ]),
    intel.peopleAttentionRadar.length
      ? h('div', { class: 'muted', style: 'margin-top:8px' }, `⚠️ ${intel.peopleAttentionRadar.length} pessoa(s) precisam de acompanhamento.`)
      : h('div', { class: 'muted', style: 'margin-top:8px' }, '✅ Acompanhamento em dia.'),
  ]);
  return cardShell('⛪ Igreja — saúde do ministério', 'church', body);
}

async function expansionYouthCard(user) {
  const intel = await computeExpansionIntelligence(user);
  let body;
  if (!intel.hasData) {
    body = emptyState({ icon: '🌍', title: 'Sem dados do Portal Expansão ainda' });
  } else {
    body = h('div', {}, [
      h('div', { class: 'grid grid-3', style: 'margin-bottom:10px' }, [
        statTile('Jovens ativos', intel.total),
        statTile('Líderes', intel.leaders),
        statTile('Batizados em água', `${intel.waterBaptism.pct}%`, null, intel.waterBaptism.pct >= 70 ? 'success' : intel.waterBaptism.pct >= 40 ? 'info' : 'critical'),
      ]),
      intel.byCity.length ? barChart(intel.byCity.slice(0, 6), { height: 130 }) : null,
      intel.upcomingBirthdays.length
        ? h('div', { class: 'muted', style: 'margin-top:6px' }, `🎂 ${intel.upcomingBirthdays.length} aniversariante(s) nos próximos 30 dias.`)
        : h('div', { class: 'muted', style: 'margin-top:6px' }, 'Nenhum aniversário nos próximos 30 dias.'),
    ]);
  }
  return cardShell('🌍 Portal Expansão — Jovens', 'church/expansion-youth', body, { clickable: true });
}
