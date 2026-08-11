import { h, clear } from '../ui/dom.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge } from '../ui/components/misc.js';

const TYPES = ['GOAL', 'PREFERENCE', 'FACT', 'DECISION', 'LESSON', 'PROJECT', 'CONTEXT', 'ACHIEVEMENT'];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🧠 Personal Memory'));
  container.appendChild(h('p', {}, 'Camada de memória pessoal — pronta para ser consultada por IA no futuro.'));
  const host = h('div', {});
  container.appendChild(host);
  await renderEntityCrud(host, {
    entityType: 'memory.item', title: 'Personal Memory', icon: '🧠', user, permissionModule: 'intelligence', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'type', label: 'Tipo', type: 'select', options: TYPES, required: true },
      { key: 'content', label: 'Conteúdo', type: 'textarea', required: true, full: true },
      { key: 'tags', label: 'Tags (separadas por vírgula)', full: true },
    ],
    columns: [{ key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') }, { key: 'content', label: 'Conteúdo' }],
    filters: [{ key: 'type', label: 'Tipo', options: TYPES }],
    emptyTitle: 'Nenhuma memória registrada',
  });
}

registerSeeder(async () => {
  const repo = createEntityService('memory.item');
  await repo.create({ type: 'PREFERENCE', content: '[DEMO] Prefere reuniões pela manhã.', tags: 'work' }, { visibility: 'PRIVATE' });
  await repo.create({ type: 'LESSON', content: '[DEMO] Adiar decisões financeiras grandes até revisar o Forecast.', tags: 'finance' }, { visibility: 'PRIVATE' });
  await repo.create({ type: 'GOAL', content: '[DEMO] Chegar a fluência avançada em inglês em 12 meses.', tags: 'english' }, { visibility: 'PRIVATE' });
});
