// Minimal DOM-building helper — no framework needed for this app's scope.
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : String(str);
  return div.innerHTML;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function fmtMoney(value, currency = 'BRL') {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  try {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency });
  } catch {
    return String(value);
  }
}

export { todayIso, daysBetween, addDays, startOfWeek, startOfMonth } from '../core/dateUtils.js';
