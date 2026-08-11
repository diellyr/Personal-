import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, sectionTitle, emptyState } from '../ui/components/misc.js';
import { todayIso } from '../core/dateUtils.js';

const CATEGORY_OPTS = ['PROFESSIONAL', 'RECRUITER', 'FAMILY', 'FRIEND', 'CHURCH', 'OTHER'];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📇 Personal CRM'));
  container.appendChild(h('p', {}, 'Contatos e relacionamentos com follow-up engine embutido.'));

  const tabs = [
    { key: 'contacts', label: 'Contatos', render: (c) => renderEntityCrud(c, contactsConfig(user)) },
    { key: 'followups', label: 'Follow-up Engine', render: renderFollowups },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderFollowups(c) {
  clear(c);
  const repo = createEntityService('crm.contact');
  const all = await repo.findAll();
  const today = todayIso();
  const due = all.filter((r) => r.data.nextInteraction && r.data.nextInteraction <= today);
  c.appendChild(sectionTitle('⏰ Pessoas que precisam de follow-up'));
  c.appendChild(due.length ? h('div', {}, due.map((r) => h('div', { class: 'card', style: 'margin-bottom:8px' }, [
    h('div', { class: 'flex-between' }, [h('strong', {}, r.data.name), badge(r.data.category, 'neutral')]),
    h('p', {}, `Última interação: ${fmtDate(r.data.lastInteraction)} · Próxima prevista: ${fmtDate(r.data.nextInteraction)}`),
    h('p', { class: 'muted' }, r.data.context || ''),
  ]))) : emptyState({ icon: '✅', title: 'Nenhum follow-up pendente' }));
}

function contactsConfig(user) {
  return {
    entityType: 'crm.contact', title: 'Contatos', icon: '👤', user, permissionModule: 'crm', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'name', label: 'Nome', required: true }, { key: 'category', label: 'Categoria', type: 'select', options: CATEGORY_OPTS, required: true },
      { key: 'company', label: 'Empresa' }, { key: 'role', label: 'Cargo' },
      { key: 'context', label: 'Contexto', type: 'textarea', full: true },
      { key: 'lastInteraction', label: 'Última interação', type: 'date' }, { key: 'nextInteraction', label: 'Próxima interação', type: 'date' },
      { key: 'tags', label: 'Tags (separadas por vírgula)' }, { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: 'Nome' }, { key: 'category', label: 'Categoria', render: (r) => badge(r.category, 'neutral') },
      { key: 'company', label: 'Empresa' }, { key: 'nextInteraction', label: 'Próx. interação', render: (r) => fmtDate(r.nextInteraction) },
    ],
    filters: [{ key: 'category', label: 'Categoria', options: CATEGORY_OPTS }],
    emptyTitle: 'Nenhum contato cadastrado',
  };
}

registerSeeder(async () => {
  const repo = createEntityService('crm.contact');
  const today = todayIso();
  await repo.create({ name: 'Talent Partner - DevOps Nation (DEMO)', category: 'RECRUITER', company: 'DevOps Nation', context: '[DEMO] Contato sobre vaga de DevSecOps Lead', lastInteraction: today, nextInteraction: today }, { visibility: 'PRIVATE' });
  await repo.create({ name: 'Pr. Adriano (DEMO)', category: 'CHURCH', context: '[DEMO] Liderança da igreja', lastInteraction: today }, { visibility: 'PRIVATE' });
});
