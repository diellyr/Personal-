import { h, clear } from './ui/dom.js';
import { installGlobalHandlers, reportError, reportSuccess } from './core/errorHandler.js';
import { initToasts } from './ui/components/toast.js';
import { initModalRoot } from './ui/components/modal.js';
import { restoreSession, login } from './core/auth.js';
import { ensureSeeded, loadAllSeeders } from './core/seed/seedData.js';
import { ensureBuiltInRoles } from './core/roleService.js';
import { renderSidebar } from './ui/layout/sidebar.js';
import { renderHeader } from './ui/layout/header.js';
import { initRouter, handleRoute, navigate, currentRoute } from './core/router.js';
import { onSessionChange } from './core/session.js';
import { initSidebarToggle } from './ui/layout/sidebarToggle.js';
import { APP_VERSION } from './core/version.js';
import { checkForStaleVersion, forceReload } from './core/versionCheck.js';

installGlobalHandlers();
initToasts();
initModalRoot();
initSidebarToggle();

const storedTheme = localStorage.getItem('dielly_os_theme');
if (storedTheme) document.documentElement.dataset.theme = storedTheme;

const loginRoot = document.getElementById('login-root');
const appRoot = document.getElementById('app');
const sidebarEl = document.getElementById('sidebar');
const headerEl = document.getElementById('header');
const contentEl = document.getElementById('app-content');
const versionBanner = document.getElementById('version-banner');

async function checkVersionBanner() {
  const stale = await checkForStaleVersion();
  clear(versionBanner);
  if (!stale) {
    versionBanner.style.display = 'none';
    return;
  }
  versionBanner.style.display = 'flex';
  versionBanner.appendChild(h('span', {}, `⚠️ Você está usando uma versão desatualizada (v${stale.running}) — a versão mais recente é v${stale.latest}.`));
  versionBanner.appendChild(h('button', { onClick: forceReload }, 'Atualizar agora'));
}
// Check once on load, then periodically in case the tab stays open across a
// deploy — this is what "sempre avisar se eu estiver usando a versão
// antiga" needs: a passive reload isn't enough, the app must actively
// notice while you're using it.
checkVersionBanner();
setInterval(checkVersionBanner, 5 * 60 * 1000);

function renderLogin(prefillError) {
  appRoot.style.display = 'none';
  loginRoot.style.display = 'flex';
  clear(loginRoot);
  loginRoot.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)';

  const userField = h('input', { type: 'text', placeholder: 'usuário (ex: dielly)', autocomplete: 'username' });
  const passField = h('input', { type: 'password', placeholder: 'senha', autocomplete: 'current-password' });
  const errorEl = h('div', { style: 'color:var(--critical);font-size:12.5px;min-height:16px;margin-top:6px' }, prefillError || '');

  const form = h('form', { class: 'card', style: 'width:340px;padding:28px' }, [
    h('div', { style: 'text-align:center;margin-bottom:18px' }, [
      h('div', { style: 'font-size:30px' }, '🧭'),
      h('h1', {}, 'Dielly OS'),
      h('span', { class: 'version-tag login' }, `v${APP_VERSION}`),
      h('p', { style: 'margin-top:10px' }, 'Personal+ — seu sistema operacional pessoal'),
    ]),
    h('div', { class: 'form-field' }, [h('label', {}, 'Usuário'), userField]),
    h('div', { class: 'form-field' }, [h('label', {}, 'Senha'), passField]),
    errorEl,
    h('button', { type: 'submit', class: 'btn btn-primary', style: 'width:100%;justify-content:center;margin-top:6px' }, 'Entrar'),
    h('div', { class: 'muted', style: 'margin-top:16px;font-size:11.5px;text-align:center' },
      'Demo: dielly / dielly123 (OWNER)  ·  esposa / esposa123 (FAMILY_ADMIN)'),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    try {
      await login(userField.value.trim(), passField.value);
      await boot();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
  loginRoot.appendChild(form);
}

async function renderShell(user) {
  loginRoot.style.display = 'none';
  appRoot.style.display = 'flex';
  await renderSidebar(sidebarEl, user);
  const { moduleKey } = currentRoute();
  const { findModule } = await import('./core/moduleRegistry.js');
  await renderHeader(headerEl, user, findModule(moduleKey));
}

async function boot() {
  try {
    // Independent of demo-data seeding: role definitions + their per-module
    // default permissions must exist on every boot (including a real,
    // non-demo install), not just when the demo dataset is seeded.
    await ensureBuiltInRoles();
  } catch (err) {
    reportError(err, 'roles');
  }
  try {
    await loadAllSeeders();
    await ensureSeeded();
  } catch (err) {
    reportError(err, 'seed');
  }
  const user = await restoreSession();
  if (!user) {
    renderLogin();
    return;
  }
  await renderShell(user);
  initRouter(contentEl, async (def) => {
    await renderSidebar(sidebarEl, user);
    await renderHeader(headerEl, user, def);
  });
  if (!location.hash) location.hash = '#/command-center';
  // handleRoute() is idempotent-safe even if the hashchange listener above
  // also fires for this same navigation (router.js de-dupes via a
  // generation counter), so calling it explicitly here guarantees the
  // first paint happens even in browsers/timings where the event doesn't.
  await handleRoute();
}

onSessionChange((user) => {
  if (!user) renderLogin();
});

boot();
