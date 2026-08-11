import { h, clear, fmtDate } from '../ui/dom.js';
import { sectionTitle, badge, emptyState } from '../ui/components/misc.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { acompanhaPlusConnector } from '../core/connectors/acompanhaPlusConnector.js';
import { connectorCard } from './importExportCenter.js';

/**
 * Dedicated home for Acompanha+ School data — previously only surfaced as a
 * small widget inside Family Hub with no way to browse/import it directly.
 * Reuses the exact same import card (with progress feedback) that ships in
 * the Import Center, so there's one working import path, not two.
 */
export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🎓 Acompanha+ School'));
  container.appendChild(h('p', {}, 'Acompanhamento escolar dos filhos — evolução, atividades, alertas e financeiro escolar, integrado via conector Acompanha+.'));

  const summaryHost = h('div', {});
  let crudHandle = null;
  container.appendChild(sectionTitle('🔌 Importar dados do Acompanha+'));
  container.appendChild(connectorCard(acompanhaPlusConnector, {
    onImported: () => { paintSummary(); if (crudHandle) crudHandle.repaint(); },
  }));

  container.appendChild(sectionTitle('👧🧒 Resumo por filho(a)'));
  container.appendChild(summaryHost);

  const crudHost = h('div', { style: 'margin-top:26px' });
  container.appendChild(crudHost);

  async function paintSummary() {
    clear(summaryHost);
    const all = (await new EntityRepository('family.acompanhaEvent').findAll()).filter((r) => canViewResource(user, r));
    if (!all.length) {
      summaryHost.appendChild(emptyState({ icon: '🎓', title: 'Nenhum dado do Acompanha+ ainda', message: 'Importe um arquivo JSON/CSV acima, ou use o dataset demo.' }));
      return;
    }
    const byChild = {};
    all.forEach((r) => { const c = r.data.childName || 'Sem nome'; (byChild[c] = byChild[c] || []).push(r.data); });
    const grid = h('div', { class: 'grid grid-2' });
    Object.entries(byChild).forEach(([child, events]) => {
      const sorted = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const alerts = events.filter((e) => e.alert);
      grid.appendChild(h('div', { class: 'card' }, [
        h('div', { class: 'flex-between' }, [h('strong', {}, child), alerts.length ? badge(`${alerts.length} alerta(s)`, 'warning') : badge('Sem alertas', 'success')]),
        h('div', { style: 'margin-top:8px' }, sorted.slice(0, 4).map((e) => h('div', { style: 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px' }, [
          h('div', { class: 'flex-between' }, [h('span', {}, e.category), h('span', { class: 'muted' }, fmtDate(e.date))]),
          e.evolution ? h('div', {}, e.evolution) : null,
          e.recommendation ? h('div', { class: 'muted' }, `💡 ${e.recommendation}`) : null,
          e.alert ? h('div', { style: 'color:var(--critical)' }, `⚠️ ${e.alert}`) : null,
          (e.installment || e.scholarship) ? h('div', { class: 'muted' }, [e.installment, e.scholarship].filter(Boolean).join(' · ')) : null,
        ]))),
      ]));
    });
    summaryHost.appendChild(grid);
  }

  await paintSummary();
  crudHandle = await renderEntityCrud(crudHost, {
    entityType: 'family.acompanhaEvent', title: 'Todos os registros', icon: '📋', user, permissionModule: 'family', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'childName', label: 'Filho(a)', required: true },
      { key: 'category', label: 'Categoria', required: true },
      { key: 'evolution', label: 'Evolução', full: true },
      { key: 'activity', label: 'Atividade' },
      { key: 'recommendation', label: 'Recomendação', full: true },
      { key: 'alert', label: 'Alerta' },
      { key: 'installment', label: 'Parcela' },
      { key: 'scholarship', label: 'Bolsa' },
      { key: 'schoolEvent', label: 'Evento escolar' },
      { key: 'date', label: 'Data', type: 'date', required: true },
    ],
    columns: [
      { key: 'childName', label: 'Filho(a)' }, { key: 'category', label: 'Categoria' },
      { key: 'evolution', label: 'Evolução' },
      { key: 'alert', label: 'Alerta', render: (r) => (r.alert ? badge(r.alert, 'warning') : '—') },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
    ],
    sortBy: (a, b) => (b.date || '').localeCompare(a.date || ''),
    emptyTitle: 'Nenhum registro Acompanha+',
    onAfterChange: paintSummary,
  });
}
