import { h, clear } from '../ui/dom.js';
import { sectionTitle, emptyState } from '../ui/components/misc.js';
import { radarChart } from '../ui/components/chart.js';
import { computeLifeBalance } from '../core/lifeBalanceIntelligence.js';

export async function render(container, ctx) {
  clear(container);
  container.appendChild(h('h1', {}, '⚖️ Life Balance Intelligence'));
  container.appendChild(h('p', {}, 'Cruza Work, Family, Church, Studies, English, Leisure, Health e Projects. Não é um score moral — o objetivo é detectar desequilíbrio.'));

  const { normalized, high, low } = await computeLifeBalance();

  container.appendChild(sectionTitle('📡 Radar de equilíbrio (últimos 30 dias, volume relativo)'));
  container.appendChild(h('div', { class: 'card' }, radarChart(normalized.map((d) => ({ label: d.label, value: d.norm })))));

  container.appendChild(sectionTitle('🔎 Leitura'));
  if (!high.length && !low.length) {
    container.appendChild(emptyState({ icon: '⚖️', title: 'Distribuição relativamente equilibrada', message: 'Nenhuma área muito acima ou abaixo das demais.' }));
  } else {
    high.forEach((d) => container.appendChild(h('div', { class: 'insight-card WARNING' }, [h('div', { class: 'insight-title' }, `${d.label} está desproporcionalmente ALTO`), h('div', { class: 'muted' }, 'Consuma consciente — verifique custo de oportunidade sobre as demais áreas.')])));
    low.forEach((d) => container.appendChild(h('div', { class: 'insight-card OPPORTUNITY' }, [h('div', { class: 'insight-title' }, `${d.label} está desproporcionalmente BAIXO`), h('div', { class: 'muted' }, 'Pode estar sendo negligenciado nas últimas semanas.')])));
  }
}
