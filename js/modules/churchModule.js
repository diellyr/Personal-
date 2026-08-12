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
import { t } from '../core/i18n.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, t('church.title')));
  container.appendChild(h('p', {}, t('church.subtitle')));

  const tabs = [
    { key: 'intelligence', label: t('church.tabIntelligence'), render: renderIntelligence },
    { key: 'roles', label: t('church.tabRoles'), render: (c) => renderEntityCrud(c, rolesConfig(user)) },
    { key: 'people', label: t('church.tabPeople'), render: (c) => renderEntityCrud(c, peopleConfig(user)) },
    { key: 'agenda', label: t('church.tabAgenda'), render: (c) => renderEntityCrud(c, agendaConfig(user)) },
    { key: 'sermons', label: t('church.tabSermons'), render: (c) => renderEntityCrud(c, sermonsConfig(user)) },
    { key: 'projects', label: t('church.tabProjects'), render: (c) => renderEntityCrud(c, projectsConfig(user)) },
    { key: 'followup', label: t('church.tabFollowup'), render: (c) => renderEntityCrud(c, followupConfig(user)) },
    { key: 'expansion-youth', label: t('church.tabExpansionYouth'), render: (c) => renderExpansionYouth(c, user) },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderIntelligence(container) {
  clear(container);
  container.appendChild(h('div', { class: 'loading-spinner' }, t('church.loadingIndicators')));
  const [intel, connMeta] = await Promise.all([computeChurchIntelligence(), connectorMetaRepository.get('expansion')]);
  clear(container);
  container.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile(t('church.statPeopleRegistered'), intel.ministryHealth.totalPeople),
    statTile(t('church.statActiveProjects'), intel.ministryHealth.activeProjects, intel.ministryHealth.stalledProjects ? t('church.statStalledProjects', { n: intel.ministryHealth.stalledProjects }) : t('church.statUpToDate')),
    statTile(t('church.statEventsSoon'), intel.ministryHealth.upcomingEvents),
    statTile(t('church.statAttentionRadar'), intel.peopleAttentionRadar.length, t('church.statPeopleSuffix')),
  ]));

  container.appendChild(sectionTitle(t('church.radarTitle')));
  container.appendChild(intel.peopleAttentionRadar.length
    ? h('div', {}, intel.peopleAttentionRadar.map((name) => h('div', { class: 'insight-card WARNING' }, [
        h('div', { class: 'insight-title' }, name),
        h('div', { class: 'muted' }, t('church.radarItemDesc')),
      ])))
    : emptyState({ icon: '✅', title: t('church.radarEmptyTitle'), message: t('church.radarEmptyMsg') }));

  container.appendChild(sectionTitle(t('church.leadershipTitle')));
  container.appendChild(intel.leadershipLoad.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
        h('thead', {}, h('tr', {}, [h('th', {}, t('church.colPerson')), h('th', {}, t('church.colActiveRoles'))])),
        h('tbody', {}, intel.leadershipLoad.map((l) => h('tr', {}, [h('td', {}, l.name), h('td', {}, l.count)]))),
      ]))
    : emptyState({ icon: '👤', title: t('church.leadershipEmpty') }));

  container.appendChild(sectionTitle(t('church.expansionTitle')));
  container.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'flex-between' }, [
      h('div', {}, [
        h('strong', {}, connMeta ? t('church.expansionStatus', { status: connMeta.status }) : t('church.expansionNotConnected')),
        h('p', {}, connMeta ? t('church.expansionImportedCount', { n: connMeta.totalRecordsImported || 0 }) : t('church.expansionImportHint')),
      ]),
      h('button', { class: 'btn', onClick: () => navigate('/church/expansion-youth') }, t('church.expansionOpenBtn')),
    ]),
  ]));
}

async function renderExpansionYouth(container, user) {
  clear(container);
  container.appendChild(h('p', {}, t('church.expYouthIntro')));

  const dashHost = h('div', {});
  let crudHandle = null;

  container.appendChild(sectionTitle(t('church.importSectionTitle')));
  container.appendChild(smartExpansionImportCard({
    onImported: async () => { await paintDash(); if (crudHandle) crudHandle.repaint(); },
  }));

  container.appendChild(sectionTitle(t('church.dashSectionTitle')));
  container.appendChild(dashHost);

  const crudHost = h('div', { style: 'margin-top:26px' });
  container.appendChild(crudHost);

  async function paintDash() {
    clear(dashHost);
    try {
      const intel = await computeExpansionIntelligence(user);
      if (!intel.hasData) {
        dashHost.appendChild(emptyState({ icon: '🌍', title: t('church.emptyNoYouth'), message: t('church.emptyNoYouthMsg') }));
        return;
      }

      dashHost.appendChild(h('div', { class: 'grid grid-4' }, [
        statTile(t('church.statActiveYouth'), intel.total),
        statTile(t('church.statLeaders'), intel.leaders, `${intel.total ? Math.round((intel.leaders / intel.total) * 100) : 0}%`),
        statTile(t('church.statWaterBaptism'), `${intel.waterBaptism.pct}%`, `${intel.waterBaptism.count}/${intel.total}`, intel.waterBaptism.pct >= 70 ? 'success' : intel.waterBaptism.pct >= 40 ? 'info' : 'critical'),
        statTile(t('church.statHolySpiritBaptism'), `${intel.holySpiritBaptism.pct}%`, `${intel.holySpiritBaptism.count}/${intel.total}`, intel.holySpiritBaptism.pct >= 70 ? 'success' : intel.holySpiritBaptism.pct >= 40 ? 'info' : 'critical'),
      ]));

      dashHost.appendChild(sectionTitle(t('church.birthdaysTitle')));
      dashHost.appendChild(intel.upcomingBirthdays.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
          h('thead', {}, h('tr', {}, [h('th', {}, t('church.fieldName')), h('th', {}, t('church.fieldDate')), h('th', {}, t('church.colBirthdayIn')), h('th', {}, t('church.colAge'))])),
          h('tbody', {}, intel.upcomingBirthdays.slice(0, 20).map((b) => h('tr', {}, [
            h('td', {}, b.name), h('td', {}, fmtDate(b.birthDate)),
            h('td', {}, b.daysUntil === 0 ? badge(t('church.today'), 'warning') : t('church.daysCount', { n: b.daysUntil })),
            h('td', {}, t('church.ageYears', { n: b.age + (b.daysUntil === 0 ? 0 : 1) })),
          ]))),
        ]))
        : emptyState({ icon: '🎂', title: t('church.noBirthdays') }));

      dashHost.appendChild(sectionTitle(t('church.noWaterBaptismTitle')));
      dashHost.appendChild(intel.notBaptizedInWater.length
        ? h('div', {}, [
          h('p', { class: 'muted' }, t('church.noWaterBaptismCount', { n: intel.notBaptizedInWater.length })),
          h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
            h('thead', {}, h('tr', {}, [h('th', {}, t('church.fieldName')), h('th', {}, t('church.colCity')), h('th', {}, t('church.colCongregation'))])),
            h('tbody', {}, intel.notBaptizedInWater.slice(0, 25).map((p) => h('tr', {}, [h('td', {}, p.name), h('td', {}, p.city || '—'), h('td', {}, p.congregation || '—')]))),
          ])),
          intel.notBaptizedInWater.length > 25 ? h('div', { class: 'muted', style: 'padding-top:6px' }, t('church.moreOthers', { n: intel.notBaptizedInWater.length - 25 })) : null,
        ])
        : emptyState({ icon: '✅', title: t('church.allBaptized') }));

      dashHost.appendChild(sectionTitle(t('church.distributionTitle')));
      dashHost.appendChild(h('div', { class: 'grid grid-2' }, [
        h('div', { class: 'card' }, [h('strong', {}, t('church.byCity')), barChart(intel.byCity, { height: 150 })]),
        h('div', { class: 'card' }, [h('strong', {}, t('church.byCongregation')), barChart(intel.byCongregation, { height: 150, color: '#0ea5a5' })]),
      ]));
      dashHost.appendChild(h('div', { class: 'grid grid-2', style: 'margin-top:14px' }, [
        h('div', { class: 'card' }, [h('strong', {}, t('church.byDeptRole')), barChart(intel.byDepartment, { height: 150, color: '#7c3aed' })]),
        h('div', { class: 'card' }, [h('strong', {}, t('church.byMaritalStatus')), barChart(intel.byMaritalStatus, { height: 150, color: '#f59e0b' })]),
      ]));
      dashHost.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, [h('strong', {}, t('church.byPastor')), barChart(intel.byPastor, { height: 160, color: '#c2273d' })]));
    } catch (err) {
      dashHost.appendChild(h('div', { class: 'insight-card CRITICAL' }, t('church.errBuildingDash', { msg: err.message })));
    }
  }

  await paintDash();
  crudHandle = await renderEntityCrud(crudHost, {
    entityType: 'church.expansionYouth', title: t('church.allYouthCrudTitle'), icon: '📋', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: t('church.fieldName'), required: true },
      { key: 'birthDate', label: t('church.fieldBirthNoun'), type: 'date' },
      { key: 'phone', label: t('church.fieldPhone') },
      { key: 'city', label: t('church.fieldCity') },
      { key: 'congregation', label: t('church.fieldCongregation') },
      { key: 'maritalStatus', label: t('church.fieldMaritalStatus') },
      { key: 'pastor', label: t('church.fieldPastor') },
      { key: 'waterBaptismDate', label: t('church.fieldWaterBaptismDate'), type: 'date' },
      { key: 'holySpiritBaptism', label: t('church.fieldHolySpiritBaptism'), type: 'checkbox' },
      { key: 'isLeader', label: t('church.fieldIsLeader'), type: 'checkbox' },
      { key: 'department', label: t('church.fieldDepartment') },
      { key: 'notes', label: t('church.fieldObservations'), full: true },
      { key: 'active', label: t('church.fieldActiveCheckbox'), type: 'checkbox', default: true },
    ],
    columns: [
      { key: 'name', label: t('church.fieldName') }, { key: 'city', label: t('church.fieldCity') }, { key: 'department', label: t('church.fieldType') },
      { key: 'isLeader', label: t('church.leaderBadge'), render: (r) => (r.isLeader ? badge(t('church.leaderBadge'), 'success') : '—') },
      { key: 'waterBaptismDate', label: t('church.statWaterBaptism'), render: (r) => (r.waterBaptismDate ? fmtDate(r.waterBaptismDate) : '—') },
    ],
    sortBy: (a, b) => (a.name || '').localeCompare(b.name || ''),
    emptyTitle: t('church.emptyYouth'),
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
      h('strong', {}, t('church.portalExpansao')),
      badge(total ? 'CONNECTED' : 'DISCONNECTED', total ? 'success' : 'neutral'),
    ]));
    statusHost.appendChild(h('p', { class: 'muted' }, t('church.statusSummary', { n: youthStatus.totalRecordsImported || 0, n2: eventStatus.totalRecordsImported || 0 })));
    statusHost.appendChild(h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-sm', onClick: async () => {
        await expansionYouthConnector.importDemoDataset();
        reportSuccess(t('church.demoImportedMsg'));
        paint();
        if (onImported) await onImported();
      } }, t('church.importDemoBtn')),
    ]));
  }

  function previewRow(item) {
    const summary = Object.entries(item.mapped)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
    return h('div', { class: 'flex-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px' }, [
      h('span', {}, summary || t('church.previewNoData')),
      item.isDuplicate ? badge(t('church.duplicateBadge'), 'warning') : badge(t('church.newBadge'), 'success'),
    ]);
  }

  async function onPreview(e) {
    const file = fileInput.files[0];
    if (!file) return reportError(new Error(t('church.chooseFileErr')));
    const previewBtn = e.currentTarget;
    previewBtn.disabled = true;
    previewBtn.textContent = t('church.analyzingBtn');
    try {
      const text = await readFileAsText(file);
      const rows = detectFormatAndParse(file.name, text);
      const connector = detectExpansionConnector(rows);
      const previewed = await connector.preview(rows);
      const newCount = previewed.filter((p) => !p.isDuplicate).length;
      clear(previewHost);
      const kindLabel = connector === expansionYouthConnector ? t('church.kindBackup') : t('church.kindEvents');
      previewHost.appendChild(h('p', { class: 'muted' }, t('church.formatDetected', { kind: kindLabel, n: previewed.length, new: newCount, dup: previewed.length - newCount })));
      previewHost.appendChild(h('div', {}, previewed.slice(0, 10).map(previewRow)));
      if (previewed.length > 10) previewHost.appendChild(h('div', { class: 'muted', style: 'padding-top:6px' }, t('church.moreOthers', { n: previewed.length - 10 })));
      const confirmBtn = h('button', {
        class: 'btn btn-primary btn-sm', style: 'margin-top:10px',
        onClick: async (e2) => {
          const btn = e2.currentTarget;
          btn.disabled = true;
          btn.textContent = t('church.importingBtn', { done: 0, total: previewed.length });
          try {
            const result = await connector.import(rows, {
              onProgress: throttleProgress((done, total) => { btn.textContent = t('church.importingBtn', { done, total }); }),
            });
            reportSuccess(t('church.importSuccessMsg', { label: connector.label, imported: result.imported, skipped: result.skipped }));
            fileInput.value = '';
            clear(previewHost);
            paint();
            if (onImported) await onImported();
          } catch (err) {
            reportError(err, connector.id);
            btn.disabled = false;
            btn.textContent = t('church.confirmImportBtn');
          }
        },
      }, t('church.confirmImportBtn'));
      previewHost.appendChild(confirmBtn);
    } catch (err) {
      reportError(err, 'expansion-smart-import');
    } finally {
      previewBtn.disabled = false;
      previewBtn.textContent = t('church.previewBtn');
    }
  }

  paint();
  return h('div', { class: 'card' }, [
    statusHost,
    h('hr', { class: 'sep' }),
    h('div', { class: 'form-field' }, [h('label', {}, t('church.fileFieldLabel')), fileInput]),
    h('p', { class: 'muted', style: 'font-size:12px' }, t('church.fileFieldHint')),
    h('button', { class: 'btn btn-sm', onClick: onPreview }, t('church.previewBtn')),
    previewHost,
  ]);
}

function rolesConfig(user) {
  return {
    entityType: 'church.role', title: t('church.rolesCrudTitle'), icon: '🎖️', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: t('church.fieldRole'), required: true },
      { key: 'holder', label: t('church.fieldHolder'), required: true },
      { key: 'startDate', label: t('church.fieldStartDate'), type: 'date' },
      { key: 'endDate', label: t('church.fieldEndDate') },
      { key: 'active', label: t('church.fieldActiveCheckbox'), type: 'checkbox', default: true },
      { key: 'description', label: t('church.fieldDescription'), type: 'textarea', full: true },
      { key: 'responsibilities', label: t('church.fieldResponsibilities'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: t('church.fieldRole') }, { key: 'holder', label: t('church.fieldHolder') },
      { key: 'active', label: t('church.colStatus'), render: (r) => badge(r.active ? t('church.activeLabel') : t('church.inactiveLabel'), r.active ? 'success' : 'neutral') },
      { key: 'startDate', label: t('church.fieldStartDate') },
    ],
    emptyTitle: t('church.emptyRoles'),
  };
}

function peopleConfig(user) {
  return {
    entityType: 'church.person', title: t('church.peopleCrudTitle'), icon: '🧑‍🤝‍🧑', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: t('church.fieldName'), required: true },
      { key: 'category', label: t('church.fieldCategory'), type: 'select', options: ['MEMBRO', 'JOVEM', 'LIDER', 'PASTOR', 'RESPONSAVEL'], required: true },
      { key: 'contact', label: t('church.fieldContact') },
      { key: 'notes', label: t('church.fieldNotesFollowup'), type: 'textarea', full: true },
    ],
    columns: [{ key: 'name', label: t('church.fieldName') }, { key: 'category', label: t('church.fieldCategory'), render: (r) => badge(r.category, 'neutral') }, { key: 'contact', label: t('church.fieldContact') }],
    filters: [{ key: 'category', label: t('church.fieldCategory'), options: ['MEMBRO', 'JOVEM', 'LIDER', 'PASTOR', 'RESPONSAVEL'] }],
    emptyTitle: t('church.emptyPeople'),
  };
}

function agendaConfig(user) {
  return {
    entityType: 'church.agenda', title: t('church.agendaCrudTitle'), icon: '📅', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: t('church.fieldTitle'), required: true },
      { key: 'type', label: t('church.fieldType'), type: 'select', options: ['CULTO', 'REUNIAO', 'EVENTO', 'CAMPANHA', 'VIGILIA', 'VIAGEM', 'ENSAIO'], required: true },
      { key: 'date', label: t('church.fieldDate'), type: 'date', required: true },
      { key: 'location', label: t('church.fieldLocation') },
      { key: 'responsible', label: t('church.fieldResponsible') },
    ],
    columns: [
      { key: 'title', label: t('church.fieldTitle') }, { key: 'type', label: t('church.fieldType'), render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: t('church.fieldDate'), render: (r) => fmtDate(r.date) }, { key: 'responsible', label: t('church.fieldResponsible'), render: (r) => r.responsible || '—' },
    ],
    sortBy: (a, b) => (a.date || '').localeCompare(b.date || ''),
    emptyTitle: t('church.emptyAgenda'),
  };
}

function sermonsConfig(user) {
  return {
    entityType: 'church.sermon', title: t('church.sermonsCrudTitle'), icon: '📖', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: t('church.fieldTitle'), required: true },
      { key: 'theme', label: t('church.fieldTheme') },
      { key: 'verses', label: t('church.fieldVerses') },
      { key: 'durationMinutes', label: t('church.fieldDuration'), type: 'number' },
      { key: 'date', label: t('church.fieldDate'), type: 'date' },
      { key: 'location', label: t('church.fieldLocation') },
      { key: 'status', label: t('church.colStatus'), type: 'select', options: ['PLANEJADO', 'PREPARADO', 'APRESENTADO'], default: 'PLANEJADO' },
    ],
    columns: [
      { key: 'title', label: t('church.fieldTitle') }, { key: 'theme', label: t('church.fieldTheme') },
      { key: 'date', label: t('church.fieldDate'), render: (r) => fmtDate(r.date) },
      { key: 'status', label: t('church.colStatus'), render: (r) => badge(r.status, r.status === 'APRESENTADO' ? 'success' : 'neutral') },
    ],
    emptyTitle: t('church.emptySermons'),
  };
}

function projectsConfig(user) {
  return {
    entityType: 'church.project', title: t('church.projectsCrudTitle'), icon: '📌', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: t('church.fieldName'), required: true },
      { key: 'type', label: t('church.fieldType'), type: 'select', options: ['EVENTO', 'ACAO', 'TREINAMENTO', 'INICIATIVA'] },
      { key: 'status', label: t('church.colStatus'), type: 'select', options: ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'], default: 'PLANEJADO' },
      { key: 'startDate', label: t('church.fieldStartDate'), type: 'date' },
      { key: 'notes', label: t('church.fieldNotes'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: t('church.fieldName') }, { key: 'type', label: t('church.fieldType'), render: (r) => badge(r.type, 'neutral') },
      { key: 'status', label: t('church.colStatus'), render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: t('church.emptyProjects'),
  };
}

function followupConfig(user) {
  return {
    entityType: 'church.followup', title: t('church.followupCrudTitle'), icon: '🤝', user, permissionModule: 'church', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'personName', label: t('church.fieldPersonName'), required: true },
      { key: 'reason', label: t('church.fieldReason'), required: true },
      { key: 'responsible', label: t('church.fieldResponsible') },
      { key: 'nextAction', label: t('church.fieldNextAction') },
      { key: 'date', label: t('church.fieldDate'), type: 'date' },
      { key: 'status', label: t('church.colStatus'), type: 'select', options: ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO'], default: 'ABERTO' },
    ],
    columns: [
      { key: 'personName', label: t('church.fieldPersonName') }, { key: 'reason', label: t('church.fieldReason') },
      { key: 'date', label: t('church.fieldDate'), render: (r) => fmtDate(r.date) },
      { key: 'status', label: t('church.colStatus'), render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'warning') },
    ],
    emptyTitle: t('church.emptyFollowup'),
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
