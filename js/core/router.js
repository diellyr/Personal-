import { findModule } from './moduleRegistry.js';
import { getCurrentUser } from './session.js';
import { can, isOwner } from './permissions.js';
import { reportError, reportWarning } from './errorHandler.js';

let contentEl = null;
let onRouteChange = null;

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
  const user = getCurrentUser();
  if (!user) return;
  const { moduleKey, subview, query } = currentRoute();
  const def = findModule(moduleKey);
  if (!def) {
    contentEl.innerHTML = `<div class="empty-state"><h2>Página não encontrada</h2><p>O módulo "${escapeHtml(moduleKey)}" não existe.</p></div>`;
    return;
  }
  if (def.ownerOnly && !isOwner(user)) {
    contentEl.innerHTML = `<div class="empty-state"><h2>Acesso restrito</h2><p>Este módulo é exclusivo do OWNER.</p></div>`;
    return;
  }
  const allowed = await can(user, def.permission, 'VIEW');
  if (!allowed) {
    contentEl.innerHTML = `<div class="empty-state"><h2>Sem permissão</h2><p>Você não tem acesso a "${escapeHtml(def.label)}".</p></div>`;
    return;
  }
  try {
    contentEl.innerHTML = '<div class="loading-spinner">Carregando…</div>';
    const mod = await def.loader();
    await mod.render(contentEl, { user, subview: subview || def.view || null, query, moduleDef: def });
    if (onRouteChange) onRouteChange(def);
  } catch (err) {
    reportError(err, `router:${moduleKey}`);
    contentEl.innerHTML = `<div class="empty-state"><h2>Erro ao carregar módulo</h2><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
