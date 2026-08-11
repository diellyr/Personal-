import { h } from '../dom.js';

/**
 * columns: [{ key, label }]
 * items: array with a `status` field (or custom statusKey)
 * renderCard: (item) => Node
 * onDrop: (item, newStatus) => void
 */
export function renderKanban({ columns, items, renderCard, onDrop, statusKey = 'status' }) {
  const board = h('div', { class: 'kanban-board' });
  columns.forEach((col) => {
    const colItems = items.filter((it) => it[statusKey] === col.key);
    const body = h('div', {
      class: 'kanban-col-body',
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/id');
        const item = items.find((it) => it.id === id);
        if (item && onDrop) onDrop(item, col.key);
      },
    }, colItems.map((item) => {
      const card = renderCard(item);
      card.classList.add('kanban-card');
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/id', item.id));
      return card;
    }));
    board.appendChild(h('div', { class: 'kanban-col' }, [
      h('div', { class: 'kanban-col-header' }, [h('span', {}, col.label), h('span', { class: 'muted' }, String(colItems.length))]),
      body,
    ]));
  });
  return board;
}
