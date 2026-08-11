import { h, clear, fmtDate, fmtMoney } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, emptyState } from '../ui/components/misc.js';
import { computeAllFitScores } from '../core/jobIntelligence.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';
import { navigate } from '../core/router.js';

const PIPELINE_STATUSES = ['FOUND', 'ANALYZED', 'APPROVED', 'APPLIED', 'RECRUITER', 'INTERVIEW', 'TECHNICAL', 'FINAL', 'OFFER', 'REJECTED', 'ARCHIVED'];
const APP_STAGES = ['PREPARE', 'REVIEW', 'APPROVE', 'EXECUTE'];
const INTERVIEW_STATUSES = ['SCHEDULED', 'PREPARING', 'DONE', 'PASSED', 'FAILED', 'WAITING'];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🎯 Job Hunter'));
  container.appendChild(h('p', {}, 'Vagas, fit score, pipeline, agente de candidatura, inteligência salarial e entrevistas.'));

  const tabs = [
    { key: 'pipeline', label: 'Pipeline', render: renderPipeline },
    { key: 'postings', label: 'Vagas', render: (c) => renderEntityCrud(c, postingConfig(user)) },
    { key: 'match', label: 'Job Match Engine', render: renderMatch },
    { key: 'application', label: 'Application Agent', render: (c) => renderEntityCrud(c, applicationConfig(user)) },
    { key: 'salary', label: 'Salary Intelligence', render: (c) => renderEntityCrud(c, salaryConfig(user)) },
    { key: 'interviews', label: 'Interview Manager', render: (c) => renderEntityCrud(c, interviewConfig(user)) },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderPipeline(c) {
  clear(c);
  const repo = createEntityService('jobs.posting');
  const items = (await repo.findAll()).map((r) => ({ id: r.id, status: r.data.status || 'FOUND', ...r.data }));
  const connMeta = await connectorMetaRepository.get('job-source');
  c.appendChild(h('div', { class: 'flex-between' }, [
    h('div', {}, [h('strong', {}, connMeta ? `Job Sources: ${connMeta.status}` : 'Job Sources: não conectado'), h('p', { class: 'muted' }, `${connMeta?.totalRecordsImported || 0} vaga(s) importada(s)`)]),
    h('button', { class: 'btn', onClick: () => navigate('/admin-integrations') }, 'Gerenciar conector'),
  ]));
  if (!items.length) { c.appendChild(emptyState({ icon: '🎯', title: 'Nenhuma vaga no pipeline', message: 'Adicione vagas manualmente ou importe via Job Sources.' })); return; }
  const { renderKanban } = await import('../ui/components/kanban.js');
  c.appendChild(h('div', { style: 'margin-top:14px' }, renderKanban({
    columns: PIPELINE_STATUSES.map((s) => ({ key: s, label: s })),
    items, statusKey: 'status',
    renderCard: (row) => h('div', {}, [h('div', { style: 'font-weight:650' }, row.role), h('div', { class: 'muted' }, row.company)]),
    onDrop: async (row, newStatus) => { await repo.update(row.id, { status: newStatus }); renderPipeline(c); },
  })));
}

async function renderMatch(c) {
  clear(c);
  c.appendChild(sectionTitle('🧮 Job Match Engine — Fit Score'));
  c.appendChild(h('p', {}, 'Cruza skills, senioridade, salário e modalidade com seu Career Vault.'));
  const results = await computeAllFitScores();
  if (!results.length) { c.appendChild(emptyState({ icon: '🧮', title: 'Nenhuma vaga cadastrada' })); return; }
  c.appendChild(h('div', {}, results.map(({ posting, fit }) => h('div', { class: 'card', style: 'margin-bottom:10px' }, [
    h('div', { class: 'flex-between' }, [
      h('div', {}, [h('strong', {}, `${posting.data.role} — ${posting.data.company}`), h('div', { class: 'muted' }, posting.data.location)]),
      badge(`${fit.score}/100`, fit.score >= 75 ? 'success' : fit.score >= 50 ? 'warning' : 'critical'),
    ]),
    h('p', { style: 'margin-top:6px' }, fit.explanation),
    fit.missing.length ? h('div', { class: 'muted' }, `Gaps: ${fit.missing.join(', ')}`) : null,
  ]))));
}

function postingConfig(user) {
  return {
    entityType: 'jobs.posting', title: 'Vagas', icon: '📋', user, permissionModule: 'jobs', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'company', label: 'Empresa', required: true }, { key: 'role', label: 'Vaga', required: true },
      { key: 'location', label: 'Localização' }, { key: 'workMode', label: 'Modalidade', type: 'select', options: ['REMOTE', 'HYBRID', 'ONSITE'], default: 'REMOTE' },
      { key: 'seniority', label: 'Senioridade', type: 'select', options: ['JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR'] },
      { key: 'salaryMin', label: 'Salário mín.', type: 'money' }, { key: 'salaryMax', label: 'Salário máx.', type: 'money' }, { key: 'currency', label: 'Moeda', default: 'BRL' },
      { key: 'skills', label: 'Skills (separadas por vírgula)', full: true },
      { key: 'url', label: 'URL', full: true }, { key: 'source', label: 'Fonte' },
      { key: 'status', label: 'Status', type: 'select', options: PIPELINE_STATUSES, default: 'FOUND' },
      { key: 'description', label: 'Descrição', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'role', label: 'Vaga' }, { key: 'company', label: 'Empresa' }, { key: 'location', label: 'Local' },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, 'neutral') },
    ],
    filters: [{ key: 'status', label: 'Status', options: PIPELINE_STATUSES }],
    emptyTitle: 'Nenhuma vaga cadastrada',
  };
}

function applicationConfig(user) {
  return {
    entityType: 'jobs.application', title: 'Application Agent', icon: '📝', user, permissionModule: 'jobs', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'targetRole', label: 'Vaga/Empresa alvo', required: true, full: true },
      { key: 'stage', label: 'Etapa', type: 'select', options: APP_STAGES, default: 'PREPARE' },
      { key: 'resumeNotes', label: 'Ajustes de currículo', type: 'textarea', full: true },
      { key: 'answers', label: 'Respostas/apresentação preparadas', type: 'textarea', full: true },
      { key: 'approved', label: 'Aprovado para envio (requer revisão humana)', type: 'checkbox' },
      { key: 'executedAt', label: 'Enviado em', type: 'date' },
    ],
    columns: [
      { key: 'targetRole', label: 'Alvo' }, { key: 'stage', label: 'Etapa', render: (r) => badge(r.stage, r.stage === 'EXECUTE' ? 'success' : 'neutral') },
      { key: 'approved', label: 'Aprovado', render: (r) => (r.approved ? badge('Sim', 'success') : badge('Não', 'neutral')) },
    ],
    emptyTitle: 'Nenhuma candidatura em preparação', emptyMessage: 'Fluxo: Preparar → Revisar → Aprovar → Executar. Nenhuma ação externa é feita automaticamente.',
  };
}

function salaryConfig(user) {
  return {
    entityType: 'jobs.salaryInfo', title: 'Salary Intelligence', icon: '💵', user, permissionModule: 'jobs', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'currentSalary', label: 'Salário atual', type: 'money' }, { key: 'expectation', label: 'Expectativa', type: 'money' },
      { key: 'currency', label: 'Moeda', default: 'BRL' }, { key: 'benefits', label: 'Benefícios', type: 'textarea', full: true },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'currentSalary', label: 'Atual', render: (r) => fmtMoney(r.currentSalary, r.currency) },
      { key: 'expectation', label: 'Expectativa', render: (r) => fmtMoney(r.expectation, r.currency) },
    ],
    emptyTitle: 'Nenhuma informação salarial registrada', emptyMessage: 'Informação privada por padrão — usada pelo Job Match Engine.',
  };
}

function interviewConfig(user) {
  return {
    entityType: 'jobs.interview', title: 'Interview Manager', icon: '🎤', user, permissionModule: 'jobs', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'company', label: 'Empresa', required: true }, { key: 'role', label: 'Vaga' },
      { key: 'recruiter', label: 'Recrutador' }, { key: 'date', label: 'Data', type: 'date', required: true },
      { key: 'time', label: 'Horário' }, { key: 'timezone', label: 'Fuso horário', default: 'America/Sao_Paulo' },
      { key: 'stage', label: 'Etapa', type: 'select', options: ['RECRUITER', 'TECHNICAL', 'BEHAVIORAL', 'FINAL'] },
      { key: 'status', label: 'Status', type: 'select', options: INTERVIEW_STATUSES, default: 'SCHEDULED' },
      { key: 'prepNotes', label: 'Preparação', type: 'textarea', full: true },
      { key: 'questions', label: 'Perguntas esperadas', type: 'textarea', full: true },
      { key: 'observations', label: 'Observações', type: 'textarea', full: true },
      { key: 'result', label: 'Resultado', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'company', label: 'Empresa' }, { key: 'role', label: 'Vaga' },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'PASSED' ? 'success' : r.status === 'FAILED' ? 'critical' : 'neutral') },
    ],
    sortBy: (a, b) => (a.date || '').localeCompare(b.date || ''),
    emptyTitle: 'Nenhuma entrevista agendada',
  };
}

registerSeeder(async () => {
  const posting = createEntityService('jobs.posting');
  const salary = createEntityService('jobs.salaryInfo');
  const interview = createEntityService('jobs.interview');
  const today = new Date().toISOString().slice(0, 10);
  const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const priv = { visibility: 'PRIVATE' };

  await posting.create({ company: 'CloudSecure Corp (DEMO)', role: 'Senior Cloud Security Engineer', location: 'Remote', workMode: 'REMOTE', seniority: 'SENIOR', salaryMin: 14000, salaryMax: 19000, currency: 'BRL', skills: 'AWS,Cloud Security,Terraform,Governance', status: 'ANALYZED', source: 'DEMO' }, priv);
  await posting.create({ company: 'DevOps Nation (DEMO)', role: 'DevSecOps Lead', location: 'Remote', workMode: 'HYBRID', seniority: 'LEAD', salaryMin: 16000, salaryMax: 22000, currency: 'BRL', skills: 'Kubernetes,AWS,Automation,Leadership', status: 'APPLIED', source: 'DEMO' }, priv);
  await salary.create({ currentSalary: 15000, expectation: 18000, currency: 'BRL', benefits: '[DEMO] VR, plano de saúde', notes: '' }, priv);
  await interview.create({ company: 'DevOps Nation (DEMO)', role: 'DevSecOps Lead', recruiter: 'Talent Partner', date: future(2), time: '10:00', stage: 'TECHNICAL', status: 'SCHEDULED', prepNotes: '[DEMO] Revisar system design.' }, priv);
});
