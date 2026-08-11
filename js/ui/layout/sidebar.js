import { h, clear } from '../dom.js';
import { NAV_GROUPS, MODULES } from '../../core/moduleRegistry.js';
import { can, isOwner } from '../../core/permissions.js';
import { currentRoute, navigate } from '../../core/router.js';

export async function renderSidebar(container, user) {
  clear(container);
  container.appendChild(h('div', { class: 'brand' }, [
    h('span', {}, '🧭'),
    h('div', {}, [h('div', {}, 'Dielly OS'), h('small', {}, 'Personal+')]),
  ]));
  const nav = h('nav', {});
  const { moduleKey: activeKey } = currentRoute();

  for (const group of NAV_GROUPS) {
    const mods = MODULES.filter((m) => m.group === group.key);
    const visible = [];
    for (const m of mods) {
      if (m.ownerOnly && !isOwner(user)) continue;
      if (await can(user, m.permission, 'VIEW')) visible.push(m);
    }
    if (!visible.length) continue;
    const groupEl = h('div', { class: 'nav-group' }, [h('div', { class: 'nav-group-label' }, group.label)]);
    visible.forEach((m) => {
      groupEl.appendChild(h('div', {
        class: `nav-item ${m.key === activeKey ? 'active' : ''}`,
        onClick: () => navigate(`/${m.key}`),
      }, [h('span', { class: 'icon' }, m.icon), h('span', {}, m.label)]));
    });
    nav.appendChild(groupEl);
  }
  container.appendChild(nav);
}
