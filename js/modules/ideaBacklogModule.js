import { h, clear } from '../ui/dom.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';

const STATUSES = ['IDEA', 'ANALYSIS', 'APPROVED', 'BUILDING', 'TESTING', 'DONE', 'DISCARDED'];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '💡 Idea Backlog'));
  container.appendChild(h('p', {}, 'Kanban de ideias — arraste entre colunas. Relacione a uma dor registrada em Pain & Opportunity.'));
  const host = h('div', {});
  container.appendChild(host);
  await renderEntityCrud(host, {
    entityType: 'ideas.idea', title: 'Idea Backlog', icon: '💡', user, permissionModule: 'intelligence', defaultVisibility: 'PRIVATE',
    kanban: { statusKey: 'status', columns: STATUSES.map((s) => ({ key: s, label: s })), cardTitle: (r) => r.title, cardSubtitle: (r) => r.linkedPain || '' },
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'description', label: 'Descrição', type: 'textarea', full: true },
      { key: 'linkedPain', label: 'Dor relacionada (texto livre)' },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES, default: 'IDEA' },
    ],
    columns: [{ key: 'title', label: 'Título' }, { key: 'status', label: 'Status' }],
    emptyTitle: 'Nenhuma ideia registrada',
  });
}

registerSeeder(async () => {
  const repo = createEntityService('ideas.idea');
  await repo.create({ title: 'Bot de status semanal automático (DEMO)', description: '[DEMO] Gerar Weekly Work Review automaticamente e enviar por email', linkedPain: 'Consolidar status de trabalho manualmente', status: 'ANALYSIS' }, { visibility: 'PRIVATE' });
  await repo.create({ title: 'Importador automático de extrato bancário (DEMO)', description: '[DEMO]', status: 'IDEA' }, { visibility: 'PRIVATE' });
});
