import { h, clear, fmtDate } from '../ui/dom.js';
import { KNOWN_ENTITY_TYPES } from '../core/exportImportService.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { listAllTasks } from '../core/tasks.js';
import { emptyState, sectionTitle, badge } from '../ui/components/misc.js';
import { todayIso } from '../core/dateUtils.js';

const SOURCES = [
  { entityType: 'family.childEvent', dateField: 'date', label: 'Family', titleFn: (d) => `${d.childName}: ${d.title}` },
  { entityType: 'family.spouse', dateField: 'date', label: 'Family', titleFn: (d) => d.title },
  { entityType: 'church.agenda', dateField: 'date', label: 'Church', titleFn: (d) => d.title },
  { entityType: 'travel.trip', dateField: 'startDate', label: 'Travel', titleFn: (d) => `Viagem: ${d.destination}` },
  { entityType: 'career.achievement', dateField: 'date', label: 'Career', titleFn: (d) => d.title },
  { entityType: 'jobs.interview', dateField: 'date', label: 'Interview', titleFn: (d) => `Entrevista: ${d.company}` },
  { entityType: 'health.record', dateField: 'date', label: 'Health', titleFn: (d) => d.title },
  { entityType: 'studies.item', dateField: 'targetDate', label: 'Studies', titleFn: (d) => d.title },
];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📅 Global Calendar'));
  container.appendChild(h('p', {}, 'Todos os compromissos da sua vida, em um só calendário — Family, Church, Travel, Career, Interview, Health, Studies, Personal, Corporate (sanitizado).'));

  const state = { categories: new Set(SOURCES.map((s) => s.label).concat(['Task'])) };
  const filterBar = h('div', { class: 'filters-bar' }, [...state.categories].map((cat) => {
    const label = h('label', { class: 'checkbox-row' }, [(() => {
      const cb = h('input', { type: 'checkbox', checked: true });
      cb.addEventListener('change', () => { if (cb.checked) state.categories.add(cat); else state.categories.delete(cat); paint(); });
      return cb;
    })(), cat]);
    return label;
  }));
  container.appendChild(filterBar);
  const listHost = h('div', {});
  container.appendChild(listHost);

  async function paint() {
    clear(listHost);
    const items = [];
    for (const src of SOURCES) {
      if (!state.categories.has(src.label)) continue;
      const all = (await new EntityRepository(src.entityType).findAll()).filter((r) => canViewResource(user, r));
      all.forEach((r) => { if (r.data[src.dateField]) items.push({ date: r.data[src.dateField], title: src.titleFn(r.data), category: src.label }); });
    }
    if (state.categories.has('Task')) {
      const tasks = await listAllTasks();
      tasks.filter((t) => t.dueDate).forEach((t) => items.push({ date: t.dueDate, title: t.title, category: 'Task' }));
    }
    items.sort((a, b) => (a.date < b.date ? -1 : 1));
    listHost.appendChild(items.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Data'), h('th', {}, 'Item'), h('th', {}, 'Categoria')])),
      h('tbody', {}, items.map((it) => h('tr', {}, [h('td', {}, fmtDate(it.date)), h('td', {}, it.title), h('td', {}, badge(it.category, 'neutral'))]))),
    ])) : emptyState({ icon: '📅', title: 'Nada no calendário com os filtros atuais' }));
  }
  await paint();
}
