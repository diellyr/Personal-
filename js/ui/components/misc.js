import { h } from '../dom.js';

export function badge(text, type = 'neutral') {
  return h('span', { class: `badge badge-${type}` }, text);
}

export function severityBadge(severity) {
  const map = { INFO: 'info', OPPORTUNITY: 'opportunity', WARNING: 'warning', CRITICAL: 'critical' };
  return badge(severity, map[severity] || 'neutral');
}

export function emptyState({ icon = '📭', title, message, actionLabel, onAction }) {
  return h('div', { class: 'empty-state' }, [
    h('div', { class: 'empty-icon' }, icon),
    h('h2', {}, title),
    h('p', {}, message || ''),
    actionLabel ? h('button', { class: 'btn btn-primary', onClick: onAction }, actionLabel) : null,
  ]);
}

export function statTile(label, value, sub) {
  return h('div', { class: 'card stat-tile' }, [
    h('div', { class: 'stat-label' }, label),
    h('div', { class: 'stat-value' }, String(value)),
    sub ? h('div', { class: 'stat-sub' }, sub) : null,
  ]);
}

export function breadcrumbs(items) {
  const el = h('div', { class: 'breadcrumbs' });
  items.forEach((it, idx) => {
    if (idx > 0) el.appendChild(h('span', { class: 'sep' }, '/'));
    el.appendChild(h('span', {}, it));
  });
  return el;
}

export function progressBar(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  return h('div', { class: 'progress-bar' }, h('div', { style: `width:${clamped}%` }));
}

export function demoTag() {
  return h('span', { class: 'demo-tag' }, 'DEMO');
}

export function sectionTitle(text, actionNode) {
  return h('div', { class: 'section-title' }, [h('h2', {}, text), actionNode || null]);
}
