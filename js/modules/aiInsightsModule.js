import { h, clear } from '../ui/dom.js';
import { generateChiefOfStaffInsights } from '../core/ai/chiefOfStaff.js';
import { generateCrossModuleInsights } from '../core/ai/crossModuleInsights.js';
import { sectionTitle, emptyState } from '../ui/components/misc.js';
import { getAiSettings } from '../core/ai/aiProviderFactory.js';

const SEV_ORDER = { CRITICAL: 4, WARNING: 3, OPPORTUNITY: 2, INFO: 1 };

export async function render(container, ctx) {
  clear(container);
  const root = h('div', {});
  container.appendChild(root);
  root.appendChild(h('div', { class: 'loading-spinner' }, 'Analisando seus módulos…'));

  const [coS, xmod, aiSettings] = await Promise.all([
    generateChiefOfStaffInsights(), generateCrossModuleInsights(), getAiSettings(),
  ]);
  const all = [...coS.map((i) => ({ ...i, source: 'Chief of Staff' })), ...xmod.map((i) => ({ ...i, source: 'Cross-Module' }))]
    .sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);

  clear(root);
  root.appendChild(sectionTitle('🤖 AI Insights', h('span', { class: 'badge badge-neutral' }, `Provider: ${aiSettings.provider}`)));
  root.appendChild(h('p', {}, 'Motor de regras local (AI Chief of Staff + Cross-Module Insight Service). Interpreta prioridades, tarefas, agenda, carga de trabalho e cruza dados entre módulos. Pronto para conectar um LLM real via Owner → AI Settings.'));

  if (!all.length) {
    root.appendChild(emptyState({ icon: '🤖', title: 'Sem insights no momento', message: 'À medida que você registrar dados nos módulos, insights aparecerão aqui.' }));
    return;
  }
  root.appendChild(h('div', {}, all.map((i) => h('div', { class: `insight-card ${i.severity}` }, [
    h('div', { class: 'flex-between' }, [
      h('div', { class: 'insight-title' }, i.title),
      h('span', { class: 'badge badge-neutral' }, `${i.module} · ${i.source}`),
    ]),
    h('div', { class: 'muted' }, i.message),
  ]))));
}
