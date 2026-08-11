import { h } from '../dom.js';

/**
 * columns: [{ key, label, render?: (row)=>Node|string, width? }]
 * rows: array of data objects
 * options: { onRowClick, actions: (row)=>Node, emptyMessage }
 */
export function renderTable(columns, rows, options = {}) {
  if (!rows || rows.length === 0) {
    return h('div', { class: 'empty-state' }, [
      h('div', { class: 'empty-icon' }, options.emptyIcon || '📭'),
      h('h2', {}, options.emptyTitle || 'Nenhum registro encontrado'),
      h('p', {}, options.emptyMessage || ''),
      options.emptyAction || null,
    ]);
  }
  const thead = h('thead', {}, [
    h('tr', {}, [
      ...columns.map((c) => h('th', { style: c.width ? `width:${c.width}` : '' }, c.label)),
      options.actions ? h('th', {}, '') : null,
    ]),
  ]);
  const tbody = h('tbody', {}, rows.map((row) => {
    const tr = h('tr', { onClick: options.onRowClick ? () => options.onRowClick(row) : null, style: options.onRowClick ? 'cursor:pointer' : '' }, [
      ...columns.map((c) => {
        const val = c.render ? c.render(row) : row[c.key];
        return h('td', {}, val instanceof Node ? val : (val === undefined || val === null ? '—' : String(val)));
      }),
      options.actions ? h('td', { onClick: (e) => e.stopPropagation() }, options.actions(row)) : null,
    ]);
    return tr;
  }));
  return h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [thead, tbody]));
}
