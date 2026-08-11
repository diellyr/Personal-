import { h, clear, fmtDate } from '../ui/dom.js';
import { sectionTitle, badge, emptyState, statTile } from '../ui/components/misc.js';
import { barChart, radarChartMulti, groupedBarChart } from '../ui/components/chart.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { acompanhaPlusConnector } from '../core/connectors/acompanhaPlusConnector.js';
import { schoolBackupConnector } from '../core/connectors/schoolBackupConnector.js';
import { computeSchoolEvolution, listSchoolChildren } from '../core/schoolIntelligence.js';
import { connectorCard } from './importExportCenter.js';

const RBO_COLOR = { R: '#c2273d', B: '#2952e3', O: '#1a8a4a' };
const RBO_TONE = { R: 'critical', B: 'info', O: 'success' };

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

  container.appendChild(sectionTitle('🎒 Importar backup completo da escola'));
  container.appendChild(h('p', { class: 'muted', style: 'margin-top:-8px' }, 'Aceita o arquivo de backup exportado pelo sistema da escola (organizações, turmas, alunos, avaliações e notas) — os dados são cruzados automaticamente para gerar a evolução escolar abaixo.'));
  container.appendChild(connectorCard(schoolBackupConnector, {
    onImported: () => paintEvolution(),
  }));

  const evolutionHost = h('div', {});
  container.appendChild(sectionTitle('📈 Evolução escolar (bimestres e semestres)'));
  container.appendChild(evolutionHost);

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

  async function paintEvolution() {
    clear(evolutionHost);
    const children = await listSchoolChildren(user);
    if (!children.length) {
      evolutionHost.appendChild(emptyState({ icon: '📈', title: 'Nenhum dado de notas ainda', message: 'Importe um backup completo da escola acima (ou o dataset demo do conector) para ver a evolução por bimestre/semestre.' }));
      return;
    }
    const select = h('select', {}, children.map((c) => h('option', { value: c }, c)));
    const bodyHost = h('div', { style: 'margin-top:14px' });
    select.addEventListener('change', () => paintChildEvolution(select.value, bodyHost));
    evolutionHost.appendChild(h('div', { class: 'form-field', style: 'max-width:320px' }, [h('label', {}, 'Filho(a)'), select]));
    evolutionHost.appendChild(bodyHost);
    await paintChildEvolution(children[0], bodyHost);
  }

  async function paintChildEvolution(childName, bodyHost) {
    clear(bodyHost);
    bodyHost.appendChild(h('div', { class: 'loading-spinner' }, 'Calculando…'));
    const ev = await computeSchoolEvolution(user, childName);
    clear(bodyHost);

    bodyHost.appendChild(h('h4', { style: 'margin:16px 0 8px' }, '🟢🔵🔴 % de avaliações Regular / Bom / Ótimo'));
    if (ev.rboTotal) {
      bodyHost.appendChild(h('div', { class: 'grid grid-3' }, ev.rboPercent.map((r) => statTile(r.label, `${r.pct}%`, `${r.count} avaliação(ões)`, RBO_TONE[r.code]))));
      bodyHost.appendChild(h('div', { class: 'card', style: 'margin-top:10px' },
        barChart(ev.rboPercent.map((r) => ({ label: r.label, value: r.pct, color: RBO_COLOR[r.code] })), { height: 140, valueFmt: (v) => `${v}%` })));
    } else {
      bodyHost.appendChild(emptyState({ icon: '📊', title: 'Sem avaliações por Regular/Bom/Ótimo ainda' }));
    }

    const bc = ev.bimesterComparison;
    bodyHost.appendChild(h('h4', { style: 'margin:20px 0 8px' }, `🕸️📊 Comparação por bimestre${bc && bc.previousLabel ? ` — ${bc.currentLabel} vs ${bc.previousLabel}` : bc ? ` — ${bc.currentLabel}` : ''}`));
    bodyHost.appendChild(renderPeriodComparison(bc));

    const sc = ev.semesterComparison;
    bodyHost.appendChild(h('h4', { style: 'margin:20px 0 8px' }, `🕸️📊 Comparação por semestre${sc && sc.previousLabel ? ` — ${sc.currentLabel} vs ${sc.previousLabel}` : sc ? ` — ${sc.currentLabel}` : ''}`));
    bodyHost.appendChild(renderPeriodComparison(sc));

    bodyHost.appendChild(h('h4', { style: 'margin:20px 0 8px' }, '📈 Evolução por categoria (todos os períodos)'));
    if (ev.categoryByPeriod.length) {
      bodyHost.appendChild(h('div', { class: 'grid grid-2' }, ev.categoryByPeriod.map((c) => h('div', { class: 'card' }, [
        h('strong', {}, c.name),
        barChart(c.series.filter((s) => s.value !== null).map((s) => ({ label: s.period.label, value: s.value })), { height: 140, valueFmt: (v) => v.toFixed(1) }),
      ]))));
    } else {
      bodyHost.appendChild(emptyState({ icon: '📈', title: 'Sem categorias com período definido ainda' }));
    }

    bodyHost.appendChild(h('h4', { style: 'margin:20px 0 8px' }, '🧮 Categorias e disciplinas — período atual'));
    const combined = [
      ...(bc ? bc.categories.filter((c) => c.current !== null).map((c) => ({ label: c.name, value: c.current, color: '#7c3aed' })) : []),
      ...(bc ? bc.subjects.filter((s) => s.current !== null).map((s) => ({ label: s.name, value: s.current, color: '#0ea5a5' })) : []),
    ];
    bodyHost.appendChild(combined.length
      ? h('div', { class: 'card' }, [
        h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px' }, '🟣 Categoria (competência) · 🟢 Disciplina (nota)'),
        barChart(combined, { height: 170, valueFmt: (v) => v.toFixed(1) }),
      ])
      : emptyState({ icon: '🧮', title: 'Sem dados do período atual ainda' }));
  }

  function renderPeriodComparison(comparison) {
    if (!comparison || !comparison.categories.length) return emptyState({ icon: '📊', title: 'Sem dados suficientes ainda' });
    const items = comparison.categories.filter((i) => i.current !== null || i.previous !== null);
    if (!items.length) return emptyState({ icon: '📊', title: 'Sem dados suficientes ainda' });
    if (!comparison.previousLabel) {
      return h('div', {}, [
        h('p', { class: 'muted' }, `Ainda não há um período anterior para comparar — mostrando apenas ${comparison.currentLabel}.`),
        h('div', { class: 'card' }, barChart(items.map((i) => ({ label: i.name, value: i.current || 0 })), { height: 160, valueFmt: (v) => v.toFixed(1) })),
      ]);
    }
    const axisLabels = items.map((i) => i.name);
    const wrap = h('div', {});
    const legend = h('div', { class: 'flex gap-8', style: 'font-size:12px;margin-bottom:6px' }, [legendDot('#2952e3', comparison.currentLabel), legendDot('#94a3b8', comparison.previousLabel)]);
    if (axisLabels.length >= 3) {
      wrap.appendChild(h('div', { class: 'card' }, [
        legend,
        radarChartMulti(axisLabels, [
          { values: items.map((i) => i.current || 0), color: '#2952e3' },
          { values: items.map((i) => i.previous || 0), color: '#94a3b8', dashed: true },
        ], { max: 10 }),
      ]));
    }
    wrap.appendChild(h('div', { class: 'card', style: 'margin-top:10px' }, [
      legend.cloneNode(true),
      groupedBarChart(items.map((i) => ({ label: i.name, values: [i.current, i.previous] })), ['current', 'previous'], { colors: ['#2952e3', '#94a3b8'], valueFmt: (v) => (v === null || v === undefined ? '' : v.toFixed(1)) }),
    ]));
    return wrap;
  }

  function legendDot(color, label) {
    return h('span', {}, [h('span', { style: `display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};margin-right:4px` }), label || '']);
  }

  await paintEvolution();
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
