import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, emptyState } from '../ui/components/misc.js';
import { barChart } from '../ui/components/chart.js';
import { computeChurchIntelligence } from '../core/churchIntelligence.js';
import { computeExpansionIntelligence } from '../core/expansionIntelligence.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';
import { navigate } from '../core/router.js';
import { expansionConnector } from '../core/connectors/expansionConnector.js';
import { expansionYouthConnector } from '../core/connectors/expansionYouthConnector.js';
import { readFileAsText, detectFormatAndParse } from '../core/importUtils.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { throttleProgress } from './importExportCenter.js';

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
    { key: 'expansion-youth', label: 'Jovens (Expansão)', render: (c) => renderExpansionYouth(c, user) },
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
        h('p', {}, connMeta ? `${connMeta.totalRecordsImported || 0} registro(s) importado(s)` : 'Importe dados do Portal Expansão (JSON/CSV) na aba "Jovens (Expansão)".'),
      ]),
      h('button', { class: 'btn', onClick: () => navigate('/church/expansion-youth') }, 'Abrir Jovens (Expansão) →'),
    ]),
  ]));
}

async function renderExpansionYouth(container, user) {
  clear(container);
  container.appendChild(h('p', {}, 'Censo do ministério de jovens do Portal Expansão — importe o backup completo (cidades, congregações e jovens) para ver a distribuição, cobertura de batismo e aniversariantes.'));

  const dashHost = h('div', {});
  let crudHandle = null;

  container.appendChild(sectionTitle('🔌 Importar dados'));
  container.appendChild(smartExpansionImportCard({
    onImported: async () => { await paintDash(); if (crudHandle) crudHandle.repaint(); },
  }));

  container.appendChild(sectionTitle('📊 Painel — jovens ativos'));
  container.appendChild(dashHost);

  const crudHost = h('div', { style: 'margin-top:26px' });
  container.appendChild(crudHost);

  async function paintDash() {
    clear(dashHost);
    try {
      const intel = await computeExpansionIntelligence(user);
      if (!intel.hasData) {
        dashHost.appendChild(emptyState({ icon: '🌍', title: 'Nenhum jovem importado ainda', message: 'Importe o backup do Portal Expansão acima, ou use o dataset demo.' }));
        return;
      }

      dashHost.appendChild(h('div', { class: 'grid grid-4' }, [
        statTile('Jovens ativos', intel.total),
        statTile('Líderes', intel.leaders, `${intel.total ? Math.round((intel.leaders / intel.total) * 100) : 0}%`),
        statTile('Batizados em água', `${intel.waterBaptism.pct}%`, `${intel.waterBaptism.count}/${intel.total}`, intel.waterBaptism.pct >= 70 ? 'success' : intel.waterBaptism.pct >= 40 ? 'info' : 'critical'),
        statTile('Batizados no Espírito', `${intel.holySpiritBaptism.pct}%`, `${intel.holySpiritBaptism.count}/${intel.total}`, intel.holySpiritBaptism.pct >= 70 ? 'success' : intel.holySpiritBaptism.pct >= 40 ? 'info' : 'critical'),
      ]));

      dashHost.appendChild(sectionTitle('🎂 Aniversariantes (próximos 30 dias)'));
      dashHost.appendChild(intel.upcomingBirthdays.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
          h('thead', {}, h('tr', {}, [h('th', {}, 'Nome'), h('th', {}, 'Data'), h('th', {}, 'Faz anos em'), h('th', {}, 'Idade')])),
          h('tbody', {}, intel.upcomingBirthdays.slice(0, 20).map((b) => h('tr', {}, [
            h('td', {}, b.name), h('td', {}, fmtDate(b.birthDate)),
            h('td', {}, b.daysUntil === 0 ? badge('Hoje!', 'warning') : `${b.daysUntil} dia(s)`),
            h('td', {}, `${b.age + (b.daysUntil === 0 ? 0 : 1)} anos`),
          ]))),
        ]))
        : emptyState({ icon: '🎂', title: 'Nenhum aniversário nos próximos 30 dias' }));

      dashHost.appendChild(sectionTitle('💧 Sem batismo em água — oportunidade de acompanhamento'));
      dashHost.appendChild(intel.notBaptizedInWater.length
        ? h('div', {}, [
          h('p', { class: 'muted' }, `${intel.notBaptizedInWater.length} jovem(ns) ainda não tem batismo em água registrado.`),
          h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
            h('thead', {}, h('tr', {}, [h('th', {}, 'Nome'), h('th', {}, 'Cidade'), h('th', {}, 'Congregação')])),
            h('tbody', {}, intel.notBaptizedInWater.slice(0, 25).map((p) => h('tr', {}, [h('td', {}, p.name), h('td', {}, p.city || '—'), h('td', {}, p.congregation || '—')]))),
          ])),
          intel.notBaptizedInWater.length > 25 ? h('div', { class: 'muted', style: 'padding-top:6px' }, `+ ${intel.notBaptizedInWater.length - 25} outro(s)…`) : null,
        ])
        : emptyState({ icon: '✅', title: 'Todos os jovens ativos têm batismo em água registrado' }));

      dashHost.appendChild(sectionTitle('📍 Distribuição'));
      dashHost.appendChild(h('div', { class: 'grid grid-2' }, [
        h('div', { class: 'card' }, [h('strong', {}, 'Por cidade'), barChart(intel.byCity, { height: 150 })]),
        h('div', { class: 'card' }, [h('strong', {}, 'Por congregação'), barChart(intel.byCongregation, { height: 150, color: '#0ea5a5' })]),
      ]));
      dashHost.appendChild(h('div', { class: 'grid grid-2', style: 'margin-top:14px' }, [
        h('div', { class: 'card' }, [h('strong', {}, 'Por função/departamento'), barChart(intel.byDepartment, { height: 150, color: '#7c3aed' })]),
        h('div', { class: 'card' }, [h('strong', {}, 'Por estado civil'), barChart(intel.byMaritalStatus, { height: 150, color: '#f59e0b' })]),
      ]));
      dashHost.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, [h('strong', {}, 'Por pastor responsável'), barChart(intel.byPastor, { height: 160, color: '#c2273d' })]));
    } catch (err) {
      dashHost.appendChild(h('div', { class: 'insight-card CRITICAL' }, `Erro ao montar o painel: ${err.message}`));
    }
  }

  await paintDash();
  crudHandle = await renderEntityCrud(crudHost, {
    entityType: 'church.expansionYouth', title: 'Todos os jovens', icon: '📋', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'birthDate', label: 'Nascimento', type: 'date' },
      { key: 'phone', label: 'Telefone' },
      { key: 'city', label: 'Cidade' },
      { key: 'congregation', label: 'Congregação' },
      { key: 'maritalStatus', label: 'Estado civil' },
      { key: 'pastor', label: 'Pastor' },
      { key: 'waterBaptismDate', label: 'Batismo em água', type: 'date' },
      { key: 'holySpiritBaptism', label: 'Batizado no Espírito Santo', type: 'checkbox' },
      { key: 'isLeader', label: 'Líder', type: 'checkbox' },
      { key: 'department', label: 'Função/Departamento' },
      { key: 'notes', label: 'Observações', full: true },
      { key: 'active', label: 'Ativo', type: 'checkbox', default: true },
    ],
    columns: [
      { key: 'name', label: 'Nome' }, { key: 'city', label: 'Cidade' }, { key: 'department', label: 'Função' },
      { key: 'isLeader', label: 'Líder', render: (r) => (r.isLeader ? badge('Líder', 'success') : '—') },
      { key: 'waterBaptismDate', label: 'Batismo água', render: (r) => (r.waterBaptismDate ? fmtDate(r.waterBaptismDate) : '—') },
    ],
    sortBy: (a, b) => (a.name || '').localeCompare(b.name || ''),
    emptyTitle: 'Nenhum jovem cadastrado',
    onAfterChange: paintDash,
  });
}

// Detects, on preview, whether the file is the full Portal Expansão backup
// ({ data: { youth, cities, congregations, ... } }, wrapped as a 1-element
// array by the generic JSON parser) or a flat expansion-event export, and
// routes to the matching connector automatically.
function detectExpansionConnector(rows) {
  const isBackup = Array.isArray(rows) && rows.length === 1 && rows[0] && rows[0].data && Array.isArray(rows[0].data.youth);
  return isBackup ? expansionYouthConnector : expansionConnector;
}

function smartExpansionImportCard({ onImported }) {
  const statusHost = h('div', {});
  const fileInput = h('input', { type: 'file', accept: '.json,.csv' });
  const previewHost = h('div', { style: 'margin-top:10px' });

  async function paint() {
    clear(statusHost);
    const [youthStatus, eventStatus] = await Promise.all([expansionYouthConnector.getStatus(), expansionConnector.getStatus()]);
    const total = (youthStatus.totalRecordsImported || 0) + (eventStatus.totalRecordsImported || 0);
    statusHost.appendChild(h('div', { class: 'flex-between' }, [
      h('strong', {}, 'Portal Expansão'),
      badge(total ? 'CONNECTED' : 'DISCONNECTED', total ? 'success' : 'neutral'),
    ]));
    statusHost.appendChild(h('p', { class: 'muted' }, `${youthStatus.totalRecordsImported || 0} jovem(ns) · ${eventStatus.totalRecordsImported || 0} evento(s)/observação(ões).`));
    statusHost.appendChild(h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-sm', onClick: async () => {
        await expansionYouthConnector.importDemoDataset();
        reportSuccess('Dataset demo importado (jovens).');
        paint();
        if (onImported) await onImported();
      } }, 'Importar dataset demo'),
    ]));
  }

  function previewRow(item) {
    const summary = Object.entries(item.mapped)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
    return h('div', { class: 'flex-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px' }, [
      h('span', {}, summary || '(sem prévia)'),
      item.isDuplicate ? badge('Duplicado — será ignorado', 'warning') : badge('Novo', 'success'),
    ]);
  }

  async function onPreview(e) {
    const file = fileInput.files[0];
    if (!file) return reportError(new Error('Escolha um arquivo .json ou .csv.'));
    const previewBtn = e.currentTarget;
    previewBtn.disabled = true;
    previewBtn.textContent = 'Analisando arquivo…';
    try {
      const text = await readFileAsText(file);
      const rows = detectFormatAndParse(file.name, text);
      const connector = detectExpansionConnector(rows);
      const previewed = await connector.preview(rows);
      const newCount = previewed.filter((p) => !p.isDuplicate).length;
      clear(previewHost);
      const kindLabel = connector === expansionYouthConnector ? 'backup completo do Portal Expansão (jovens)' : 'eventos/observações Portal Expansão';
      previewHost.appendChild(h('p', { class: 'muted' }, `Formato detectado: ${kindLabel} · ${previewed.length} registro(s) · ${newCount} novo(s) · ${previewed.length - newCount} duplicado(s).`));
      previewHost.appendChild(h('div', {}, previewed.slice(0, 10).map(previewRow)));
      if (previewed.length > 10) previewHost.appendChild(h('div', { class: 'muted', style: 'padding-top:6px' }, `+ ${previewed.length - 10} outro(s)…`));
      const confirmBtn = h('button', {
        class: 'btn btn-primary btn-sm', style: 'margin-top:10px',
        onClick: async (e2) => {
          const btn = e2.currentTarget;
          btn.disabled = true;
          btn.textContent = `Importando 0/${previewed.length}…`;
          try {
            const result = await connector.import(rows, {
              onProgress: throttleProgress((done, total) => { btn.textContent = `Importando ${done}/${total}…`; }),
            });
            reportSuccess(`${connector.label}: ${result.imported} importado(s), ${result.skipped} ignorado(s) (duplicado/erro).`);
            fileInput.value = '';
            clear(previewHost);
            paint();
            if (onImported) await onImported();
          } catch (err) {
            reportError(err, connector.id);
            btn.disabled = false;
            btn.textContent = 'Confirmar importação';
          }
        },
      }, 'Confirmar importação');
      previewHost.appendChild(confirmBtn);
    } catch (err) {
      reportError(err, 'expansion-smart-import');
    } finally {
      previewBtn.disabled = false;
      previewBtn.textContent = 'Pré-visualizar';
    }
  }

  paint();
  return h('div', { class: 'card' }, [
    statusHost,
    h('hr', { class: 'sep' }),
    h('div', { class: 'form-field' }, [h('label', {}, 'Importar arquivo (.json ou .csv)'), fileInput]),
    h('p', { class: 'muted', style: 'font-size:12px' }, 'Aceita tanto o backup completo do Portal Expansão quanto um export simples de eventos/observações — o formato é detectado automaticamente.'),
    h('button', { class: 'btn btn-sm', onClick: onPreview }, 'Pré-visualizar'),
    previewHost,
  ]);
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
