import { h, clear } from '../dom.js';

/**
 * tabs: [{ key, label, render: (container) => void }]
 * Renders tab strip + a content container, wires click handlers, renders active tab.
 */
export function renderTabs(tabs, initialKey) {
  const wrap = h('div', {});
  const tabStrip = h('div', { class: 'tabs' });
  const content = h('div', { class: 'tab-content' });
  let active = initialKey || tabs[0].key;

  function paintStrip() {
    clear(tabStrip);
    tabs.forEach((t) => {
      tabStrip.appendChild(h('div', {
        class: `tab ${t.key === active ? 'active' : ''}`,
        onClick: () => { active = t.key; paintStrip(); paintContent(); },
      }, t.label));
    });
  }
  function paintContent() {
    clear(content);
    const tab = tabs.find((t) => t.key === active);
    if (tab) tab.render(content);
  }
  paintStrip();
  paintContent();
  wrap.appendChild(tabStrip);
  wrap.appendChild(content);
  return wrap;
}
