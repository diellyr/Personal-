import { h, clear } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, progressBar, emptyState } from '../ui/components/misc.js';
import { computeSkillGapRadar } from '../core/skillGapRadar.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📚 Estudos & Skills'));
  container.appendChild(h('p', {}, 'Cursos, certificações, livros, trilhas e o Skill Gap Radar (mercado x seu nível x estudos).'));

  const tabs = [
    { key: 'items', label: 'Estudos & Skills', render: (c) => renderEntityCrud(c, studiesConfig(user)) },
    { key: 'gap', label: 'Skill Gap Radar', render: renderGapRadar },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderGapRadar(c) {
  clear(c);
  c.appendChild(sectionTitle('🎯 Skill Gap Radar'));
  c.appendChild(h('p', {}, 'Cruza demanda de vagas (Job Hunter), seu nível (Career Evidence) e estudos em andamento.'));
  const rows = await computeSkillGapRadar();
  if (!rows.length) { c.appendChild(emptyState({ icon: '🎯', title: 'Sem dados suficientes ainda', message: 'Cadastre vagas no Job Hunter e achievements no Career para calcular gaps.' })); return; }
  c.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Skill'), h('th', {}, 'Demanda (mercado)'), h('th', {}, 'Meu nível'), h('th', {}, 'Gap'), h('th', {}, 'Prioridade'), h('th', {}, 'Estudando?')])),
    h('tbody', {}, rows.map((r) => h('tr', {}, [
      h('td', {}, r.skill), h('td', {}, String(r.demand)), h('td', {}, String(r.level)),
      h('td', {}, String(r.gap)), h('td', {}, badge(r.priority, r.priority === 'ALTA' ? 'critical' : r.priority === 'MEDIA' ? 'warning' : 'neutral')),
      h('td', {}, r.inProgress ? badge('Sim', 'success') : badge('Não', 'neutral')),
    ]))),
  ])));
}

function studiesConfig(user) {
  return {
    entityType: 'studies.item', title: 'Estudos & Skills', icon: '📘', user, permissionModule: 'studies', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['CURSO', 'CERTIFICACAO', 'LIVRO', 'VIDEO', 'TRILHA', 'SKILL'], required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO'], default: 'NAO_INICIADO' },
      { key: 'progressPercent', label: 'Progresso (%)', type: 'number' },
      { key: 'hoursStudied', label: 'Horas estudadas', type: 'number' },
      { key: 'skillTags', label: 'Skills relacionadas (separadas por vírgula)', full: true },
      { key: 'targetDate', label: 'Meta de conclusão', type: 'date' },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
      { key: 'progressPercent', label: 'Progresso', render: (r) => `${r.progressPercent || 0}%` },
    ],
    emptyTitle: 'Nenhum item de estudo cadastrado',
  };
}

registerSeeder(async () => {
  const repo = createEntityService('studies.item');
  const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  await repo.create({ title: 'AWS Certified Security — Specialty (DEMO)', type: 'CERTIFICACAO', status: 'EM_ANDAMENTO', progressPercent: 55, hoursStudied: 28, skillTags: 'AWS,Cloud Security', targetDate: future(60) }, { visibility: 'PRIVATE' });
  await repo.create({ title: 'Terraform na prática (DEMO)', type: 'CURSO', status: 'CONCLUIDO', progressPercent: 100, hoursStudied: 12, skillTags: 'Terraform,Automation' }, { visibility: 'PRIVATE' });
  await repo.create({ title: 'Kubernetes fundamentals (DEMO)', type: 'TRILHA', status: 'NAO_INICIADO', progressPercent: 0, skillTags: 'Kubernetes' }, { visibility: 'PRIVATE' });
});
