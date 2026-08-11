import { h, clear } from '../ui/dom.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, progressBar } from '../ui/components/misc.js';

const PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LONG_TERM'];
const MODULES = ['family', 'church', 'finance', 'work', 'career', 'jobs', 'english', 'studies', 'hobbies', 'health', 'projects'];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🎯 Goals'));
  container.appendChild(h('p', {}, 'Metas diárias, semanais, mensais, trimestrais, anuais e de longo prazo, relacionadas a qualquer módulo.'));
  const host = h('div', {});
  container.appendChild(host);
  await renderEntityCrud(host, {
    entityType: 'goals.goal', title: 'Goals', icon: '🎯', user, permissionModule: 'projects', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'module', label: 'Módulo relacionado', type: 'select', options: MODULES, required: true },
      { key: 'period', label: 'Período', type: 'select', options: PERIODS, required: true },
      { key: 'targetMetric', label: 'Métrica alvo' }, { key: 'targetValue', label: 'Valor alvo', type: 'number' },
      { key: 'targetMinutes', label: 'Minutos alvo (se aplicável)', type: 'number' },
      { key: 'currentValue', label: 'Valor atual', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'ACHIEVED', 'MISSED'], default: 'ACTIVE' },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'module', label: 'Módulo', render: (r) => badge(r.module, 'neutral') },
      { key: 'period', label: 'Período' }, { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'ACHIEVED' ? 'success' : r.status === 'MISSED' ? 'critical' : 'info') },
    ],
    filters: [{ key: 'period', label: 'Período', options: PERIODS }, { key: 'module', label: 'Módulo', options: MODULES }],
    emptyTitle: 'Nenhuma meta cadastrada',
  });
}

registerSeeder(async () => {
  const repo = createEntityService('goals.goal');
  await repo.create({ title: 'Estudar inglês 150min/semana (DEMO)', module: 'english', period: 'WEEKLY', targetMinutes: 150, currentValue: 50, status: 'ACTIVE' }, { visibility: 'PRIVATE' });
  await repo.create({ title: 'Concluir certificação AWS Security (DEMO)', module: 'career', period: 'QUARTERLY', targetMetric: 'Certificação concluída', status: 'ACTIVE' }, { visibility: 'PRIVATE' });
});
