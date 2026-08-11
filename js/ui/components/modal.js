import { h, clear } from '../dom.js';

let root = null;

export function initModalRoot() {
  root = document.getElementById('modal-root');
}

export function closeModal() {
  if (root) clear(root);
}

export function openModal({ title, bodyNode, width = 560 }) {
  clear(root);
  const modal = h('div', { class: 'modal', style: `max-width:${width}px` }, [
    h('div', { class: 'modal-header' }, [
      h('h3', {}, title),
      h('button', { class: 'modal-close', onClick: closeModal }, '✕'),
    ]),
    h('div', { class: 'modal-body' }, bodyNode),
  ]);
  const backdrop = h('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === backdrop) closeModal(); } }, modal);
  root.appendChild(backdrop);
  return { close: closeModal };
}

export function confirmDialog({ title = 'Confirmar ação', message, danger = true, confirmLabel = 'Confirmar' }) {
  return new Promise((resolve) => {
    const body = h('div', {}, [
      h('p', {}, message),
      h('div', { class: 'form-actions' }, [
        h('button', { class: 'btn', onClick: () => { closeModal(); resolve(false); } }, 'Cancelar'),
        h('button', { class: danger ? 'btn btn-danger' : 'btn btn-primary', onClick: () => { closeModal(); resolve(true); } }, confirmLabel),
      ]),
    ]);
    openModal({ title, bodyNode: body, width: 440 });
  });
}
