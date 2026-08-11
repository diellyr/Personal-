import { h } from '../dom.js';
import { registerToastRenderer } from '../../core/errorHandler.js';

export function initToasts() {
  const root = document.getElementById('toast-root');
  registerToastRenderer(({ type, message }) => {
    const el = h('div', { class: `toast toast-${type}` }, message);
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .25s';
      setTimeout(() => el.remove(), 260);
    }, 4200);
  });
}
