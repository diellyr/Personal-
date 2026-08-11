import { h, clear, fmtDateTime } from '../dom.js';
import { logout } from '../../core/auth.js';
import { listForUser, unreadCount, markRead, markResolved } from '../../core/notifications.js';
import { severityBadge } from '../components/misc.js';
import { navigate } from '../../core/router.js';

let dropdownOpen = false;

export async function renderHeader(container, user, def) {
  clear(container);
  const crumbs = h('div', { class: 'breadcrumbs' }, `${def ? def.label : ''}`);

  const bell = h('button', { class: 'notif-bell', title: 'Notificações' }, '🔔');
  const count = await unreadCount(user.id);
  if (count > 0) bell.appendChild(h('span', { class: 'notif-dot' }, String(count > 99 ? '99+' : count)));
  const dropdownHost = h('div', { style: 'position:relative' }, bell);
  bell.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
    await paintDropdown();
  });

  async function paintDropdown() {
    const existing = dropdownHost.querySelector('.notif-dropdown');
    if (existing) existing.remove();
    if (!dropdownOpen) return;
    const notifs = (await listForUser(user.id)).slice(0, 20);
    const list = notifs.length
      ? notifs.map((n) => h('div', {
          style: 'padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer',
          onClick: async () => { await markRead(n.id); dropdownOpen = false; await paintDropdown(); if (n.linkedEntity) {} },
        }, [
          h('div', { class: 'flex-between' }, [h('strong', { style: 'font-size:12.5px' }, n.title), severityBadge(n.severity)]),
          h('div', { class: 'muted', style: 'font-size:12px;margin:3px 0' }, n.message),
          h('div', { class: 'muted', style: 'font-size:10.5px' }, `${n.module} · ${fmtDateTime(n.createdAt)} · ${n.status}`),
        ]))
      : [h('div', { style: 'padding:16px;text-align:center' }, 'Sem notificações.')];
    const dd = h('div', {
      class: 'notif-dropdown card',
      style: 'position:absolute;right:0;top:34px;width:340px;max-height:420px;overflow-y:auto;padding:0;z-index:50',
    }, [
      h('div', { style: 'padding:10px 12px;font-weight:700;border-bottom:1px solid var(--border)' }, 'Notification Center'),
      ...list,
      h('div', { style: 'padding:8px 12px;text-align:center' }, h('button', { class: 'link-btn', onClick: () => navigate('/tasks') }, 'Ver todas as tarefas')),
    ]);
    dropdownHost.appendChild(dd);
  }
  document.addEventListener('click', () => { if (dropdownOpen) { dropdownOpen = false; paintDropdown(); } }, { once: false });

  const themeBtn = h('button', { class: 'btn btn-icon', title: 'Alternar tema' }, document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙');
  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('dielly_os_theme', next);
    themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  const userMenu = h('div', { class: 'flex gap-8', style: 'cursor:pointer' }, [
    h('div', { class: 'avatar' }, user.displayName.slice(0, 2).toUpperCase()),
  ]);
  userMenu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const existing = document.getElementById('user-dropdown');
    if (existing) { existing.remove(); return; }
    const dd = h('div', {
      id: 'user-dropdown', class: 'card',
      style: 'position:absolute;right:20px;top:56px;width:200px;padding:8px;z-index:50',
    }, [
      h('div', { style: 'padding:6px 8px;font-weight:700' }, user.displayName),
      h('div', { style: 'padding:0 8px 6px;font-size:11px' }, h('span', { class: 'badge badge-info' }, user.role)),
      h('hr', { class: 'sep', style: 'margin:6px 0' }),
      h('div', { class: 'nav-item', style: 'color:var(--text)', onClick: () => logout().then(() => location.reload()) }, '🚪 Sair'),
    ]);
    document.body.appendChild(dd);
    document.addEventListener('click', () => dd.remove(), { once: true });
  });

  container.appendChild(crumbs);
  container.appendChild(h('div', { class: 'header-actions' }, [dropdownHost, themeBtn, userMenu]));
}
