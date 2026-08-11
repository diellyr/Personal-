import { h, clear } from '../ui/dom.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, progressBar } from '../ui/components/misc.js';

const CATEGORIES = ['PERSONAL', 'CAREER', 'FAMILY', 'CHURCH', 'TECH', 'FINANCIAL', 'OTHER'];
const STATUSES = ['ACTIVE', 'PAUSED', 'DONE', 'CANCELED'];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📁 Projetos'));
  container.appendChild(h('p', {}, 'Todos os seus projetos pessoais, de carreira, família, igreja e tecnologia em um só lugar.'));
  const host = h('div', {});
  container.appendChild(host);
  await renderEntityCrud(host, {
    entityType: 'projects.project', title: 'Projetos', icon: '📁', user, permissionModule: 'projects', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'name', label: 'Nome', required: true, full: true },
      { key: 'category', label: 'Categoria', type: 'select', options: CATEGORIES, required: true },
      { key: 'objective', label: 'Objetivo', type: 'textarea', full: true },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, default: 'ACTIVE' },
      { key: 'priority', label: 'Prioridade', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
      { key: 'impact', label: 'Impacto' },
      { key: 'startDate', label: 'Início', type: 'date' }, { key: 'dueDate', label: 'Prazo', type: 'date' },
      { key: 'progressPercent', label: 'Progresso (%)', type: 'number' },
    ],
    columns: [
      { key: 'name', label: 'Nome' }, { key: 'category', label: 'Categoria', render: (r) => badge(r.category, 'neutral') },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'DONE' ? 'success' : r.status === 'ACTIVE' ? 'info' : 'neutral') },
      { key: 'progressPercent', label: 'Progresso', render: (r) => `${r.progressPercent || 0}%` },
    ],
    filters: [{ key: 'status', label: 'Status', options: STATUSES }, { key: 'category', label: 'Categoria', options: CATEGORIES }],
    emptyTitle: 'Nenhum projeto cadastrado',
  });
}

registerSeeder(async () => {
  const repo = createEntityService('projects.project');
  const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  await repo.create({ name: 'Reformar quintal (DEMO)', category: 'PERSONAL', objective: '[DEMO] Espaço de lazer para a família', status: 'ACTIVE', priority: 'MEDIUM', startDate: future(-10), dueDate: future(30), progressPercent: 35 }, { visibility: 'FAMILY' });
  await repo.create({ name: 'Certificação AWS Security (DEMO)', category: 'CAREER', objective: '[DEMO] Fortalecer perfil técnico', status: 'ACTIVE', priority: 'HIGH', progressPercent: 55 }, { visibility: 'PRIVATE' });
});
