import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, emptyState } from '../ui/components/misc.js';
import { barChart } from '../ui/components/chart.js';
import { computeDailyBrief, computeWeeklyReview, computeJiraDashboard, computeTimesheet } from '../core/workIntelligence.js';
import { createTask } from '../core/tasks.js';
import { reportSuccess } from '../core/errorHandler.js';
import { openModal, closeModal } from '../ui/components/modal.js';
import { renderForm } from '../ui/components/form.js';

const KIND_OPTS = ['MEETING', 'JIRA', 'DEEPWORK', 'ADMINISTRATION', 'OTHER'];
const CATEGORY_OPTS = ['Cloud Security', 'Security Advisory', 'Governance', 'AWS', 'DevOps', 'Automation', 'Vulnerability Management', 'Meeting', 'Administration', 'Outros'];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '💼 Work Intelligence'));
  container.appendChild(h('p', {}, 'Atividades, reuniões, Jira, deep work e inteligência de tempo de trabalho.'));

  const tabs = [
    { key: 'brief', label: 'Daily Work Brief', render: renderDailyBrief },
    { key: 'weekly', label: 'Weekly Work Review', render: renderWeeklyReview },
    { key: 'activities', label: 'Atividades', render: (c) => renderEntityCrud(c, activitiesConfig(user)) },
    { key: 'meetings', label: 'Meeting Intelligence', render: renderMeetingIntelligence },
    { key: 'jira', label: 'Jira Intelligence', render: renderJiraIntelligence },
    { key: 'timesheet', label: 'Timesheet', render: renderTimesheet },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderDailyBrief(c) {
  clear(c);
  const b = await computeDailyBrief();
  c.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile('Reuniões hoje', b.meetings.length, `${Math.round(b.meetingMinutes / 60 * 10) / 10}h`),
    statTile('Jira em atraso', b.jiraOverdue.length),
    statTile('Deep work disponível', `${Math.round(b.deepWorkAvailable / 60 * 10) / 10}h`),
    statTile('Tarefas de trabalho abertas', b.workTasks.length),
  ]));
  c.appendChild(sectionTitle('📋 Prioridades de hoje'));
  c.appendChild(b.workTasks.length ? h('div', {}, b.workTasks.slice(0, 6).map((t) => h('div', { class: 'card', style: 'margin-bottom:8px' }, [
    h('div', { class: 'flex-between' }, [h('strong', {}, t.title), badge(t.priority, 'neutral')]),
  ]))) : emptyState({ icon: '✅', title: 'Sem tarefas de trabalho pendentes' }));
  if (b.jiraOverdue.length) {
    c.appendChild(sectionTitle('🚨 Jira em atraso'));
    c.appendChild(h('div', {}, b.jiraOverdue.map((j) => h('div', { class: 'insight-card CRITICAL' }, [
      h('div', { class: 'insight-title' }, j.data.ticketRef || j.data.title),
      h('div', { class: 'muted' }, `Vencido em ${fmtDate(j.data.dueDate)} · ${j.data.category}`),
    ]))));
  }
}

async function renderWeeklyReview(c) {
  clear(c);
  const r = await computeWeeklyReview();
  c.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile('Total de horas', `${Math.round(r.totalMinutes / 60 * 10) / 10}h`),
    statTile('Reuniões', `${Math.round(r.meetingMinutes / 60 * 10) / 10}h`),
    statTile('Deep work', `${Math.round(r.deepWorkMinutes / 60 * 10) / 10}h`),
    statTile('Entregas concluídas', r.delivered.length),
  ]));
  c.appendChild(sectionTitle('💡 Recomendações da semana'));
  c.appendChild(r.recommendations.length ? h('div', {}, r.recommendations.map((rec) => h('div', { class: 'insight-card WARNING' }, rec))) : emptyState({ icon: '✅', title: 'Semana equilibrada', message: 'Nenhum ponto de atenção identificado.' }));
  c.appendChild(sectionTitle('📦 Principais resultados'));
  c.appendChild(r.delivered.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Item'), h('th', {}, 'Categoria'), h('th', {}, 'Resultado')])),
    h('tbody', {}, r.delivered.map((a) => h('tr', {}, [h('td', {}, a.data.title || a.data.ticketRef), h('td', {}, a.data.category), h('td', {}, a.data.result || '—')]))),
  ])) : emptyState({ icon: '📦', title: 'Nenhuma entrega concluída esta semana' }));
}

async function renderMeetingIntelligence(c) {
  clear(c);
  const repo = createEntityService('work.activity');
  const meetings = (await repo.findAll()).filter((a) => a.data.kind === 'MEETING');
  c.appendChild(sectionTitle('🎯 Meeting ROI'));
  if (!meetings.length) { c.appendChild(emptyState({ icon: '🗓️', title: 'Nenhuma reunião registrada' })); return; }
  c.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Título'), h('th', {}, 'Duração'), h('th', {}, 'Decisões/Ações'), h('th', {}, 'ROI'), h('th', {}, '')])),
    h('tbody', {}, meetings.map((m) => {
      const actionsCount = (m.data.actions || '').split('\n').filter((l) => l.trim()).length;
      const duration = Number(m.data.durationMinutes) || 1;
      const roi = actionsCount / (duration / 30);
      const roiLabel = roi >= 1 ? 'Alto' : roi >= 0.4 ? 'Médio' : 'Baixo';
      return h('tr', {}, [
        h('td', {}, m.data.title),
        h('td', {}, `${duration}min`),
        h('td', {}, String(actionsCount)),
        h('td', {}, badge(roiLabel, roi >= 1 ? 'success' : roi >= 0.4 ? 'warning' : 'critical')),
        h('td', {}, m.data.actions ? h('button', { class: 'btn btn-sm', onClick: () => createTasksFromActions(m) }, '→ Criar tarefas') : ''),
      ]);
    })),
  ])));
}

async function createTasksFromActions(meeting) {
  const lines = (meeting.data.actions || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    await createTask({ title: line, module: 'work', priority: 'MEDIUM', owner: meeting.owner_id, source: 'MeetingActionEngine', linkedEntity: meeting.id });
  }
  reportSuccess(`${lines.length} tarefa(s) criada(s) a partir das ações da reunião.`);
}

async function renderJiraIntelligence(c) {
  clear(c);
  const j = await computeJiraDashboard();
  c.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile('Total', j.total), statTile('Abertos', j.open.length), statTile('Concluídos', j.done.length), statTile('Atrasados', j.overdue.length),
  ]));
  c.appendChild(sectionTitle('⏸️ Sem movimento há mais de 10 dias'));
  c.appendChild(j.stale.length ? h('div', {}, j.stale.map((t) => h('div', { class: 'insight-card WARNING' }, [h('div', { class: 'insight-title' }, t.data.ticketRef || t.data.title), h('div', { class: 'muted' }, t.data.category)]))) : emptyState({ icon: '✅', title: 'Nenhum ticket parado' }));
  c.appendChild(sectionTitle('📊 Por categoria'));
  c.appendChild(j.byCategory.length ? h('div', { class: 'card' }, barChart(j.byCategory, { valueFmt: (v) => `${v}h` })) : emptyState({ icon: '📊', title: 'Sem dados de Jira' }));
}

async function renderTimesheet(c) {
  clear(c);
  const state = { range: 'WEEK' };
  const host = h('div', {});
  c.appendChild(h('div', { class: 'tabs', style: 'border:none' }, ['DAY', 'WEEK', 'MONTH'].map((r) =>
    h('div', { class: `tab ${state.range === r ? 'active' : ''}`, onClick: async () => { state.range = r; await paint(); } }, r === 'DAY' ? 'Dia' : r === 'WEEK' ? 'Semana' : 'Mês'))));
  c.appendChild(host);
  async function paint() {
    clear(host);
    const t = await computeTimesheet(state.range);
    host.appendChild(sectionTitle('⏱️ Distribuição de tempo por categoria'));
    host.appendChild(t.byCategory.length ? h('div', { class: 'card' }, barChart(t.byCategory, { valueFmt: (v) => `${v}h` })) : emptyState({ icon: '⏱️', title: 'Sem atividades no período' }));
    host.appendChild(sectionTitle('🧩 Por tipo'));
    if (t.byKind.length) host.appendChild(h('div', { class: 'card' }, barChart(t.byKind, { valueFmt: (v) => `${v}h`, color: '#0ea5a5' })));
  }
  await paint();
}

function activitiesConfig(user) {
  return {
    entityType: 'work.activity', title: 'Atividades de Trabalho', icon: '🗂️', user, permissionModule: 'work', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'kind', label: 'Tipo', type: 'select', options: KIND_OPTS, required: true },
      { key: 'category', label: 'Categoria', type: 'select', options: CATEGORY_OPTS, required: true },
      { key: 'date', label: 'Data', type: 'date', required: true },
      { key: 'durationMinutes', label: 'Duração (min)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['OPEN', 'DONE'], default: 'OPEN' },
      { key: 'dueDate', label: 'Prazo (Jira)' , type: 'date' },
      { key: 'ticketRef', label: 'Ticket (Jira)' },
      { key: 'skills', label: 'Skills (separadas por vírgula)' },
      { key: 'participants', label: 'Participantes (reunião)' },
      { key: 'actions', label: 'Ações da reunião (uma por linha)', type: 'textarea', full: true },
      { key: 'result', label: 'Resultado', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'kind', label: 'Tipo', render: (r) => badge(r.kind, 'neutral') },
      { key: 'category', label: 'Categoria' }, { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'DONE' ? 'success' : 'neutral') },
    ],
    filters: [{ key: 'kind', label: 'Tipo', options: KIND_OPTS }],
    sortBy: (a, b) => (b.date || '').localeCompare(a.date || ''),
    emptyTitle: 'Nenhuma atividade registrada', emptyMessage: 'Registre manualmente ou importe via Corporate Collector (Owner).',
  };
}

registerSeeder(async () => {
  const repo = createEntityService('work.activity');
  const today = new Date().toISOString().slice(0, 10);
  const priv = { visibility: 'PRIVATE' };
  await repo.create({ title: 'Weekly Security Governance Sync (DEMO)', kind: 'MEETING', category: 'Governance', date: today, durationMinutes: 60, participants: '5 pessoas', actions: 'Atualizar matriz de risco\nAgendar follow-up com time de AWS', status: 'DONE', result: '[DEMO]' }, priv);
  await repo.create({ title: 'Revisar findings de vulnerabilidade (DEMO)', kind: 'JIRA', category: 'Vulnerability Management', date: today, durationMinutes: 90, ticketRef: 'SEC-4821', status: 'OPEN', dueDate: today }, priv);
  await repo.create({ title: 'Hardening pipeline IaC (DEMO)', kind: 'DEEPWORK', category: 'Automation', date: today, durationMinutes: 150, status: 'DONE', skills: 'Terraform,DevOps' }, priv);
  await repo.create({ title: 'Timesheet e status report (DEMO)', kind: 'ADMINISTRATION', category: 'Administration', date: today, durationMinutes: 30, status: 'DONE' }, priv);
});
