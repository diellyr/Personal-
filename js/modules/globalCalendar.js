import { h, clear, fmtDate } from '../ui/dom.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { listAllTasks } from '../core/tasks.js';
import { emptyState, sectionTitle } from '../ui/components/misc.js';
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

// One fixed, distinct color per category — used for the calendar dots, the
// legend, and the list badges, so a category reads the same color
// everywhere. Chosen dark enough for white text (chips) and legible as
// small dots against both light and dark backgrounds.
const CATEGORY_COLORS = {
  Family: '#2952e3',
  Church: '#7c3aed',
  Travel: '#0ea5a5',
  Career: '#b45309',
  Interview: '#c2273d',
  Health: '#be185d',
  Studies: '#16a34a',
  Task: '#475569',
};
const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

function categoryChip(category) {
  return h('span', { class: 'category-chip', style: `background:${CATEGORY_COLORS[category] || '#475569'}` }, category);
}

function categoryDot(category) {
  return h('span', { class: 'calendar-dot', style: `background:${CATEGORY_COLORS[category] || '#475569'}`, title: category });
}

function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const cursor = new Date(year, month, 1 - startDow);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    cells.push({ date: isoFromDate(cursor), day: cursor.getDate(), inMonth: cursor.getMonth() === month });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📅 Global Calendar'));
  container.appendChild(h('p', {}, 'Todos os compromissos da sua vida, em um só calendário — Family, Church, Travel, Career, Interview, Health, Studies, Task.'));

  const state = {
    categories: new Set(ALL_CATEGORIES),
    viewDate: new Date(),
    selectedDate: todayIso(),
  };

  const legend = h('div', { class: 'calendar-legend' }, ALL_CATEGORIES.map((cat) => {
    const chip = h('span', {
      class: 'category-chip', style: `background:${CATEGORY_COLORS[cat]};cursor:pointer;opacity:1`,
      onClick: () => { if (state.categories.has(cat)) state.categories.delete(cat); else state.categories.add(cat); paint(); },
    }, cat);
    return chip;
  }));
  container.appendChild(h('p', { class: 'field-hint', style: 'margin:-4px 0 8px' }, 'Clique em uma categoria para mostrar/ocultar.'));
  container.appendChild(legend);

  const calendarHost = h('div', {});
  const selectedDayHost = h('div', { style: 'margin-top:18px' });
  const listHost = h('div', { style: 'margin-top:18px' });
  container.appendChild(calendarHost);
  container.appendChild(selectedDayHost);
  container.appendChild(listHost);

  function updateLegendOpacity() {
    legend.childNodes.forEach((chip, i) => {
      chip.style.opacity = state.categories.has(ALL_CATEGORIES[i]) ? '1' : '0.35';
    });
  }

  async function fetchItems() {
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
    return items.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  function paintCalendar(itemsByDate) {
    clear(calendarHost);
    const monthLabel = state.viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    calendarHost.appendChild(h('div', { class: 'calendar-nav' }, [
      h('button', { class: 'btn btn-sm', onClick: () => { state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1); paint(); } }, '←'),
      h('h3', {}, monthLabel),
      h('button', { class: 'btn btn-sm', onClick: () => { state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1); paint(); } }, '→'),
    ]));
    const today = todayIso();
    const grid = h('div', { class: 'calendar-grid' }, [
      ...DOW_LABELS.map((d) => h('div', { class: 'calendar-dow' }, d)),
      ...buildMonthGrid(state.viewDate).map((cell) => {
        const dayItems = itemsByDate.get(cell.date) || [];
        // One dot per distinct category (not per item) — a day with 6 tasks
        // in the same category should read as "one busy category", not as
        // 4 identical dots + "+2" that hide which other categories exist.
        const distinctCats = [...new Set(dayItems.map((it) => it.category))];
        const extraItems = dayItems.length - distinctCats.length;
        const classes = ['calendar-cell'];
        if (!cell.inMonth) classes.push('out-month');
        if (cell.date === today) classes.push('today');
        if (cell.date === state.selectedDate) classes.push('selected');
        return h('div', {
          class: classes.join(' '),
          onClick: () => { state.selectedDate = cell.date; paintCalendar(itemsByDate); paintSelectedDay(itemsByDate); },
        }, [
          h('span', { class: 'calendar-day-number' }, String(cell.day)),
          h('div', { class: 'calendar-dots' }, distinctCats.map((cat) => categoryDot(cat))),
          extraItems > 0 ? h('div', { class: 'calendar-more' }, `${dayItems.length} itens`) : null,
        ]);
      }),
    ]);
    calendarHost.appendChild(grid);
  }

  function paintSelectedDay(itemsByDate) {
    clear(selectedDayHost);
    const items = itemsByDate.get(state.selectedDate) || [];
    selectedDayHost.appendChild(sectionTitle(`📌 ${fmtDate(state.selectedDate)}`));
    selectedDayHost.appendChild(items.length
      ? h('div', {}, items.map((it) => h('div', { class: 'card', style: 'margin-bottom:8px;padding:10px 14px' }, [
          h('div', { class: 'flex-between' }, [h('strong', {}, it.title), categoryChip(it.category)]),
        ])))
      : emptyState({ icon: '📌', title: 'Nada neste dia' }));
  }

  async function paint() {
    updateLegendOpacity();
    const items = await fetchItems();
    const itemsByDate = new Map();
    items.forEach((it) => {
      if (!itemsByDate.has(it.date)) itemsByDate.set(it.date, []);
      itemsByDate.get(it.date).push(it);
    });

    paintCalendar(itemsByDate);
    paintSelectedDay(itemsByDate);

    clear(listHost);
    listHost.appendChild(sectionTitle('🗒️ Todos os próximos compromissos'));
    listHost.appendChild(items.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Data'), h('th', {}, 'Item'), h('th', {}, 'Categoria')])),
      h('tbody', {}, items.map((it) => h('tr', {
        onClick: () => { state.selectedDate = it.date; paintCalendar(itemsByDate); paintSelectedDay(itemsByDate); },
        style: 'cursor:pointer',
      }, [h('td', {}, fmtDate(it.date)), h('td', {}, it.title), h('td', {}, categoryChip(it.category))]))),
    ])) : emptyState({ icon: '📅', title: 'Nada no calendário com os filtros atuais' }));
  }

  await paint();
}
