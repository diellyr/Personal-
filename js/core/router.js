import { findModule } from './moduleRegistry.js';
import { getCurrentUser } from './session.js';
import { can, isOwner } from './permissions.js';
import { reportError, reportWarning } from './errorHandler.js';
import { isModuleEnabled } from './moduleManager.js';

let contentEl = null;
let onRouteChange = null;
let routeGeneration = 0;

export function initRouter(contentElement, callback) {
  contentEl = contentElement;
  onRouteChange = callback;
  window.addEventListener('hashchange', handleRoute);
}

export function navigate(hash) {
  if (location.hash === `#${hash}`) {
    handleRoute();
  } else {
    location.hash = hash;
  }
}

export function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, queryStr] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  return { moduleKey: parts[0] || 'command-center', subview: parts[1] || null, query };
}

export async function handleRoute() {
  // Guards against overlapping calls (e.g. a hashchange event firing while
  // an explicit handleRoute() from boot() is still awaiting) racing to
  // paint into the same #header/#app-content and duplicating content.
  const myGeneration = ++routeGeneration;
  const isStale = () => myGeneration !== routeGeneration;

  const user = getCurrentUser();
  if (!user) return;
  const { moduleKey, subview, query } = currentRoute();
  const def = findModule(moduleKey);
  if (!def) {
    if (isStale()) return;
    contentEl.innerHTML = `<div class="empty-state"><h2>Página não encontrada</h2><p>O módulo "${escapeHtml(moduleKey)}" não existe.</p></div>`;
    return;
  }
  if (def.ownerOnly && !isOwner(user)) {
    if (isStale()) return;
    contentEl.innerHTML = `<div class="empty-state"><h2>Acesso restrito</h2><p>Este módulo é exclusivo do OWNER.</p></div>`;
    return;
  }
  if (!def.key.startsWith('admin-') && !def.key.startsWith('owner-') && !(await isModuleEnabled(def.key))) {
    if (isStale()) return;
    contentEl.innerHTML = `<div class="empty-state"><h2>Módulo desativado</h2><p>Este módulo foi desativado pelo administrador.</p></div>`;
    return;
  }
  const allowed = await can(user, def.permission, 'VIEW');
  if (isStale()) return;
  if (!allowed) {
    contentEl.innerHTML = `<div class="empty-state"><h2>Sem permissão</h2><p>Você não tem acesso a "${escapeHtml(def.label)}".</p></div>`;
    return;
  }
  try {
    contentEl.innerHTML = '<div class="loading-spinner">Carregando…</div>';
    const mod = await def.loader();
    if (isStale()) return;
    await mod.render(contentEl, { user, subview: subview || def.view || null, query, moduleDef: def });
    if (isStale()) return;
    if (onRouteChange) await onRouteChange(def);
  } catch (err) {
    if (isStale()) return;
    reportError(err, `router:${moduleKey}`);
    contentEl.innerHTML = `<div class="empty-state"><h2>Erro ao carregar módulo</h2><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
