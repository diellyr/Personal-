import { h, clear } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, sectionTitle, emptyState } from '../ui/components/misc.js';
import { listAllTasks } from '../core/tasks.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🩹 Pain & Opportunity'));
  container.appendChild(h('p', {}, 'Dores recorrentes e o Automation Opportunity Engine — o que vale a pena automatizar.'));

  const tabs = [
    { key: 'pains', label: 'Pain Tracker', render: (c) => renderEntityCrud(c, painConfig(user)) },
    { key: 'detector', label: 'Pain Detector', render: renderDetector },
    { key: 'opportunities', label: 'Automation Opportunity Engine', render: renderOpportunities },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderDetector(c) {
  clear(c);
  c.appendChild(sectionTitle('🔍 Pain Detector'));
  c.appendChild(h('p', {}, 'Detecta atividades semelhantes registradas repetidamente nas Tarefas — candidatas a automação.'));
  const tasks = await listAllTasks();
  const normalized = {};
  tasks.forEach((t) => {
    const key = t.title.toLowerCase().replace(/[0-9]+/g, '').trim();
    normalized[key] = (normalized[key] || []).concat(t);
  });
  const repeated = Object.entries(normalized).filter(([, list]) => list.length >= 3).sort((a, b) => b[1].length - a[1].length);
  c.appendChild(repeated.length ? h('div', {}, repeated.map(([key, list]) => h('div', { class: 'insight-card OPPORTUNITY' }, [
    h('div', { class: 'insight-title' }, `"${list[0].title}" repetida ${list.length}x`),
    h('div', { class: 'muted' }, `Módulo: ${list[0].module} — considere registrar como Pain/Oportunidade de automação.`),
  ]))) : emptyState({ icon: '✅', title: 'Nenhum padrão repetitivo detectado ainda' }));
}

async function renderOpportunities(c) {
  clear(c);
  const repo = createEntityService('pains.pain');
  const all = await repo.findAll();
  const ranked = all.map((p) => {
    const impact = Number(p.data.impactScore || 1);
    const freq = Number(p.data.frequencyScore || 1);
    const timeSaved = Number(p.data.timeLostMinutes || 0);
    const effort = Number(p.data.effortScore || 1);
    const roi = (impact * freq * timeSaved) / effort;
    return { ...p.data, roi: Math.round(roi) };
  }).sort((a, b) => b.roi - a.roi);
  c.appendChild(sectionTitle('🏗️ Ranking de oportunidades de automação'));
  c.appendChild(ranked.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Dor'), h('th', {}, 'Impacto'), h('th', {}, 'Frequência'), h('th', {}, 'Tempo perdido (min)'), h('th', {}, 'Esforço'), h('th', {}, 'ROI Score')])),
    h('tbody', {}, ranked.map((r) => h('tr', {}, [h('td', {}, r.title), h('td', {}, r.impactScore || '—'), h('td', {}, r.frequencyScore || '—'), h('td', {}, r.timeLostMinutes || 0), h('td', {}, r.effortScore || '—'), h('td', {}, badge(String(r.roi), r.roi > 20 ? 'success' : 'neutral'))]))),
  ])) : emptyState({ icon: '🏗️', title: 'Nenhuma dor com scores de automação preenchidos' }));
}

function painConfig(user) {
  return {
    entityType: 'pains.pain', title: 'Pain Tracker', icon: '🩹', user, permissionModule: 'intelligence', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Dor', required: true, full: true },
      { key: 'category', label: 'Categoria' }, { key: 'impact', label: 'Impacto', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
      { key: 'impactScore', label: 'Impacto (1-5)', type: 'number' }, { key: 'frequencyScore', label: 'Frequência (1-5)', type: 'number' },
      { key: 'timeLostMinutes', label: 'Tempo perdido (min/ocorrência)', type: 'number' }, { key: 'effortScore', label: 'Esforço p/ automatizar (1-5)', type: 'number' },
      { key: 'automatable', label: 'Automatizável', type: 'checkbox' },
      { key: 'suggestedSolution', label: 'Solução sugerida', type: 'textarea', full: true },
      { key: 'status', label: 'Status', type: 'select', options: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
    ],
    columns: [{ key: 'title', label: 'Dor' }, { key: 'impact', label: 'Impacto', render: (r) => badge(r.impact || '—', 'neutral') }, { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'RESOLVED' ? 'success' : 'neutral') }],
    emptyTitle: 'Nenhuma dor registrada',
  };
}

registerSeeder(async () => {
  const repo = createEntityService('pains.pain');
  await repo.create({ title: 'Consolidar status de trabalho manualmente toda semana (DEMO)', category: 'Work', impact: 'HIGH', impactScore: 4, frequencyScore: 4, timeLostMinutes: 45, effortScore: 2, automatable: true, suggestedSolution: 'Usar Weekly Work Review automático', status: 'OPEN' }, { visibility: 'PRIVATE' });
});
