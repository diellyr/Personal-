import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, emptyState } from '../ui/components/misc.js';
import { computeChurchIntelligence } from '../core/churchIntelligence.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';
import { navigate } from '../core/router.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '⛪ Igreja'));
  container.appendChild(h('p', {}, 'Módulo genérico — não amarrado a um cargo específico. Funções, pessoas, agenda, pregações, projetos e acompanhamento.'));

  const tabs = [
    { key: 'intelligence', label: 'Church Intelligence', render: renderIntelligence },
    { key: 'roles', label: 'Funções e Cargos', render: (c) => renderEntityCrud(c, rolesConfig(user)) },
    { key: 'people', label: 'Pessoas', render: (c) => renderEntityCrud(c, peopleConfig(user)) },
    { key: 'agenda', label: 'Agenda', render: (c) => renderEntityCrud(c, agendaConfig(user)) },
    { key: 'sermons', label: 'Pregações e Estudos', render: (c) => renderEntityCrud(c, sermonsConfig(user)) },
    { key: 'projects', label: 'Projetos', render: (c) => renderEntityCrud(c, projectsConfig(user)) },
    { key: 'followup', label: 'Acompanhamento', render: (c) => renderEntityCrud(c, followupConfig(user)) },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderIntelligence(container) {
  clear(container);
  container.appendChild(h('div', { class: 'loading-spinner' }, 'Calculando indicadores…'));
  const [intel, connMeta] = await Promise.all([computeChurchIntelligence(), connectorMetaRepository.get('expansion')]);
  clear(container);
  container.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile('Pessoas cadastradas', intel.ministryHealth.totalPeople),
    statTile('Projetos ativos', intel.ministryHealth.activeProjects, intel.ministryHealth.stalledProjects ? `${intel.ministryHealth.stalledProjects} parados` : 'em dia'),
    statTile('Eventos (14 dias)', intel.ministryHealth.upcomingEvents),
    statTile('Radar de atenção', intel.peopleAttentionRadar.length, 'pessoas'),
  ]));

  container.appendChild(sectionTitle('🚨 People Attention Radar'));
  container.appendChild(intel.peopleAttentionRadar.length
    ? h('div', {}, intel.peopleAttentionRadar.map((name) => h('div', { class: 'insight-card WARNING' }, [
        h('div', { class: 'insight-title' }, name),
        h('div', { class: 'muted' }, 'Acompanhamento atrasado ou sem atualização há mais de 21 dias.'),
      ])))
    : emptyState({ icon: '✅', title: 'Sem alertas de acompanhamento', message: 'Todos os acompanhamentos estão em dia.' }));

  container.appendChild(sectionTitle('👥 Leadership Load'));
  container.appendChild(intel.leadershipLoad.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
        h('thead', {}, h('tr', {}, [h('th', {}, 'Pessoa'), h('th', {}, 'Cargos ativos')])),
        h('tbody', {}, intel.leadershipLoad.map((l) => h('tr', {}, [h('td', {}, l.name), h('td', {}, l.count)]))),
      ]))
    : emptyState({ icon: '👤', title: 'Nenhum cargo ativo registrado' }));

  container.appendChild(sectionTitle('🌍 Portal Expansão (integração)'));
  container.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'flex-between' }, [
      h('div', {}, [
        h('strong', {}, connMeta ? `Status: ${connMeta.status}` : 'Ainda não conectado'),
        h('p', {}, connMeta ? `${connMeta.totalRecordsImported || 0} registro(s) importado(s)` : 'Importe dados do Portal Expansão (JSON/CSV) na Integration Center.'),
      ]),
      h('button', { class: 'btn', onClick: () => navigate('/admin-integrations') }, 'Gerenciar conector'),
    ]),
  ]));
}

function rolesConfig(user) {
  return {
    entityType: 'church.role', title: 'Funções e Cargos', icon: '🎖️', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: 'Cargo', required: true },
      { key: 'holder', label: 'Responsável', required: true },
      { key: 'startDate', label: 'Início', type: 'date' },
      { key: 'endDate', label: 'Fim' },
      { key: 'active', label: 'Ativo', type: 'checkbox', default: true },
      { key: 'description', label: 'Descrição', type: 'textarea', full: true },
      { key: 'responsibilities', label: 'Responsabilidades', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Cargo' }, { key: 'holder', label: 'Responsável' },
      { key: 'active', label: 'Status', render: (r) => badge(r.active ? 'Ativo' : 'Inativo', r.active ? 'success' : 'neutral') },
      { key: 'startDate', label: 'Início' },
    ],
    emptyTitle: 'Nenhum cargo cadastrado',
  };
}

function peopleConfig(user) {
  return {
    entityType: 'church.person', title: 'Pessoas', icon: '🧑‍🤝‍🧑', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'category', label: 'Categoria', type: 'select', options: ['MEMBRO', 'JOVEM', 'LIDER', 'PASTOR', 'RESPONSAVEL'], required: true },
      { key: 'contact', label: 'Contato' },
      { key: 'notes', label: 'Observações / acompanhamento', type: 'textarea', full: true },
    ],
    columns: [{ key: 'name', label: 'Nome' }, { key: 'category', label: 'Categoria', render: (r) => badge(r.category, 'neutral') }, { key: 'contact', label: 'Contato' }],
    filters: [{ key: 'category', label: 'Categoria', options: ['MEMBRO', 'JOVEM', 'LIDER', 'PASTOR', 'RESPONSAVEL'] }],
    emptyTitle: 'Nenhuma pessoa cadastrada',
  };
}

function agendaConfig(user) {
  return {
    entityType: 'church.agenda', title: 'Agenda', icon: '📅', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: 'Título', required: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['CULTO', 'REUNIAO', 'EVENTO', 'CAMPANHA', 'VIGILIA', 'VIAGEM', 'ENSAIO'], required: true },
      { key: 'date', label: 'Data', type: 'date', required: true },
      { key: 'location', label: 'Local' },
      { key: 'responsible', label: 'Responsável' },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) }, { key: 'responsible', label: 'Responsável', render: (r) => r.responsible || '—' },
    ],
    sortBy: (a, b) => (a.date || '').localeCompare(b.date || ''),
    emptyTitle: 'Nenhum evento agendado',
  };
}

function sermonsConfig(user) {
  return {
    entityType: 'church.sermon', title: 'Pregações e Estudos', icon: '📖', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: 'Título', required: true },
      { key: 'theme', label: 'Tema' },
      { key: 'verses', label: 'Texto / Versículos' },
      { key: 'durationMinutes', label: 'Duração (min)', type: 'number' },
      { key: 'date', label: 'Data', type: 'date' },
      { key: 'location', label: 'Local' },
      { key: 'status', label: 'Status', type: 'select', options: ['PLANEJADO', 'PREPARADO', 'APRESENTADO'], default: 'PLANEJADO' },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'theme', label: 'Tema' },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'APRESENTADO' ? 'success' : 'neutral') },
    ],
    emptyTitle: 'Nenhuma pregação/estudo registrado',
  };
}

function projectsConfig(user) {
  return {
    entityType: 'church.project', title: 'Projetos', icon: '📌', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['EVENTO', 'ACAO', 'TREINAMENTO', 'INICIATIVA'] },
      { key: 'status', label: 'Status', type: 'select', options: ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'], default: 'PLANEJADO' },
      { key: 'startDate', label: 'Início', type: 'date' },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: 'Nome' }, { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: 'Nenhum projeto cadastrado',
  };
}

function followupConfig(user) {
  return {
    entityType: 'church.followup', title: 'Acompanhamento', icon: '🤝', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'personName', label: 'Pessoa', required: true },
      { key: 'reason', label: 'Motivo', required: true },
      { key: 'responsible', label: 'Responsável' },
      { key: 'nextAction', label: 'Próxima ação' },
      { key: 'date', label: 'Data', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO'], default: 'ABERTO' },
    ],
    columns: [
      { key: 'personName', label: 'Pessoa' }, { key: 'reason', label: 'Motivo' },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'warning') },
    ],
    emptyTitle: 'Nenhum acompanhamento em aberto',
  };
}

registerSeeder(async () => {
  const { EntityRepository } = await import('../core/entityRepository.js');
  const role = new EntityRepository('church.role');
  const person = new EntityRepository('church.person');
  const agenda = new EntityRepository('church.agenda');
  const sermon = new EntityRepository('church.sermon');
  const project = new EntityRepository('church.project');
  const followup = new EntityRepository('church.followup');
  const today = new Date().toISOString().slice(0, 10);
  const vis = { visibility: 'FAMILY' };

  await role.create({ title: 'Líder de Jovens (DEMO)', holder: 'Dielly', startDate: '2024-01-01', active: true, description: '[DEMO]', responsibilities: 'Reuniões semanais, mentoria' }, vis);
  await person.create({ name: 'João Pedro (DEMO)', category: 'JOVEM', contact: '(31) 90000-0000', notes: '[DEMO] Novo convertido' }, vis);
  await person.create({ name: 'Ana Beatriz (DEMO)', category: 'LIDER', contact: '', notes: '[DEMO]' }, vis);
  await agenda.create({ title: 'Culto de celebração (DEMO)', type: 'CULTO', date: today, location: 'Templo Sede', responsible: 'Pr. Adriano' }, vis);
  await agenda.create({ title: 'Reunião de líderes (DEMO)', type: 'REUNIAO', date: today, location: 'Sala 2', responsible: 'Dielly' }, vis);
  await sermon.create({ title: 'Fé em tempos de incerteza (DEMO)', theme: 'Fé', verses: 'Hebreus 11:1', durationMinutes: 35, date: today, status: 'PREPARADO' }, vis);
  await project.create({ name: 'Mutirão de evangelismo (DEMO)', type: 'ACAO', status: 'EM_ANDAMENTO', startDate: today, notes: '[DEMO]' }, vis);
  await followup.create({ personName: 'Carla Nunes (DEMO)', reason: 'Frequência em queda', responsible: 'Dielly', nextAction: 'Ligar essa semana', date: today, status: 'ABERTO' }, vis);
});
