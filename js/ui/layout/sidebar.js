import { h, clear } from '../dom.js';
import { NAV_GROUPS, MODULES } from '../../core/moduleRegistry.js';
import { can, isOwner } from '../../core/permissions.js';
import { currentRoute, navigate } from '../../core/router.js';
import { isModuleEnabled } from '../../core/moduleManager.js';
import { closeSidebar } from './sidebarToggle.js';
import { APP_VERSION } from '../../core/version.js';

export async function renderSidebar(container, user) {
  clear(container);
  container.appendChild(h('div', { class: 'brand' }, [
    h('span', {}, '🧭'),
    h('div', {}, [
      h('div', { class: 'flex gap-8', style: 'align-items:baseline' }, ['Dielly OS', h('span', { class: 'version-tag' }, `v${APP_VERSION}`)]),
      h('small', {}, 'Personal+'),
    ]),
  ]));
  const nav = h('nav', {});
  const { moduleKey: activeKey } = currentRoute();

  for (const group of NAV_GROUPS) {
    const mods = MODULES.filter((m) => m.group === group.key);
    const visible = [];
    for (const m of mods) {
      if (m.ownerOnly && !isOwner(user)) continue;
      if (!m.key.startsWith('admin-') && !m.key.startsWith('owner-') && !(await isModuleEnabled(m.key))) continue;
      if (await can(user, m.permission, 'VIEW')) visible.push(m);
    }
    if (!visible.length) continue;
    const groupEl = h('div', { class: 'nav-group' }, [h('div', { class: 'nav-group-label' }, group.label)]);
    visible.forEach((m) => {
      groupEl.appendChild(h('div', {
        class: `nav-item ${m.key === activeKey ? 'active' : ''}`,
        onClick: () => { closeSidebar(); navigate(`/${m.key}`); },
      }, [h('span', { class: 'icon' }, m.icon), h('span', {}, m.label)]));
    });
    nav.appendChild(groupEl);
  }
  container.appendChild(nav);
}
