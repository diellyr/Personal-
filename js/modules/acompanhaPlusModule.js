import { h, clear, fmtDate } from '../ui/dom.js';
import { sectionTitle, badge, emptyState, statTile } from '../ui/components/misc.js';
import { barChart, radarChartMulti, groupedBarChart } from '../ui/components/chart.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { acompanhaPlusConnector } from '../core/connectors/acompanhaPlusConnector.js';
import { schoolBackupConnector } from '../core/connectors/schoolBackupConnector.js';
import { computeSchoolEvolution, listSchoolChildren } from '../core/schoolIntelligence.js';
import { readFileAsText, detectFormatAndParse } from '../core/importUtils.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { throttleProgress } from './importExportCenter.js';
import { confirmDialog } from '../ui/components/modal.js';

const RBO_COLOR = { R: '#c2273d', B: '#2952e3', O: '#1a8a4a' };
const RBO_TONE = { R: 'critical', B: 'info', O: 'success' };

/**
 * Dedicated home for Acompanha+ School data — previously only surfaced as a
 * small widget inside Family Hub with no way to browse/import it directly.
 * A single file field auto-detects whether it's a plain Acompanha+ export or
 * a full school-system backup and routes to the right connector — having
 * two separate import cards here (one per connector) turned out to be
 * confusing enough that people picked the wrong one, importing content
 * that doesn't belong to that entity type as garbage placeholder records.
 */
export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🎓 Acompanha+ School'));
  container.appendChild(h('p', {}, 'Acompanhamento escolar dos filhos — evolução, atividades, alertas, financeiro escolar e notas por bimestre/semestre.'));

  const summaryHost = h('div', {});
  const evolutionHost = h('div', {});
  const maintenanceHost = h('div', {});
  let crudHandle = null;

  container.appendChild(sectionTitle('🔌 Importar dados'));
  container.appendChild(smartImportCard({
    onImported: async () => { await paintEvolution(); await paintSummary(); if (crudHandle) crudHandle.repaint(); await paintMaintenance(); },
  }));

  container.appendChild(sectionTitle('📈 Evolução escolar (bimestres e semestres)'));
  container.appendChild(evolutionHost);

  container.appendChild(sectionTitle('👧🧒 Resumo por filho(a)'));
  container.appendChild(summaryHost);

  container.appendChild(maintenanceHost);

  const crudHost = h('div', { style: 'margin-top:26px' });
  container.appendChild(crudHost);

  async function paintMaintenance() {
    clear(maintenanceHost);
    const [events, grades] = await Promise.all([
      new EntityRepository('family.acompanhaEvent').findAll(),
      new EntityRepository('family.schoolGrade').findAll(),
    ]);
    const orphanEvents = events.filter((r) => !r.data.childName);
    const orphanGrades = grades.filter((r) => !r.data.childName);
    const totalOrphans = orphanEvents.length + orphanGrades.length;
    if (!totalOrphans) return;
    maintenanceHost.appendChild(h('div', { class: 'insight-card WARNING', style: 'margin-top:16px' }, [
      h('div', { class: 'insight-title' }, `⚠️ ${totalOrphans} registro(s) sem filho(a) vinculado`),
      h('p', {}, 'Normalmente isso acontece quando um arquivo do formato errado é importado por engano. Esses registros não aparecem em nenhum gráfico — você pode removê-los com segurança.'),
      h('button', { class: 'btn btn-danger btn-sm', onClick: async () => {
        const ok = await confirmDialog({
          title: 'Remover registros sem filho(a)?',
          message: `Isso vai apagar ${orphanEvents.length} evento(s) do Acompanha+ e ${orphanGrades.length} registro(s) de notas sem filho(a) vinculado. Registros com filho(a) preenchido não são afetados. Esta ação não pode ser desfeita.`,
          confirmLabel: 'Remover',
        });
        if (!ok) return;
        await Promise.all([
          ...orphanEvents.map((r) => new EntityRepository('family.acompanhaEvent').hardDelete(r.id)),
          ...orphanGrades.map((r) => new EntityRepository('family.schoolGrade').hardDelete(r.id)),
        ]);
        reportSuccess(`${totalOrphans} registro(s) removido(s).`);
        await paintEvolution(); await paintSummary(); if (crudHandle) crudHandle.repaint(); await paintMaintenance();
      } }, 'Remover registros inválidos'),
    ]));
  }

  async function paintSummary() {
    clear(summaryHost);
    try {
      const all = (await new EntityRepository('family.acompanhaEvent').findAll()).filter((r) => canViewResource(user, r) && r.data.childName);
      if (!all.length) {
        summaryHost.appendChild(emptyState({ icon: '🎓', title: 'Nenhum dado do Acompanha+ ainda', message: 'Importe um arquivo JSON/CSV acima, ou use o dataset demo.' }));
        return;
      }
      const byChild = {};
      all.forEach((r) => { const c = r.data.childName; (byChild[c] = byChild[c] || []).push(r.data); });
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
    } catch (err) {
      summaryHost.appendChild(h('div', { class: 'insight-card CRITICAL' }, `Erro ao carregar o resumo: ${err.message}`));
    }
  }

  async function paintEvolution() {
    clear(evolutionHost);
    try {
      const children = await listSchoolChildren(user);
      if (!children.length) {
        evolutionHost.appendChild(emptyState({ icon: '📈', title: 'Nenhum dado de notas ainda', message: 'Importe um backup completo da escola acima (ou o dataset demo) para ver a evolução por bimestre/semestre.' }));
        return;
      }
      const select = h('select', {}, children.map((c) => h('option', { value: c }, c)));
      const bodyHost = h('div', { style: 'margin-top:14px' });
      select.addEventListener('change', () => paintChildEvolution(select.value, bodyHost));
      evolutionHost.appendChild(h('div', { class: 'form-field', style: 'max-width:320px' }, [h('label', {}, 'Filho(a)'), select]));
      evolutionHost.appendChild(bodyHost);
      await paintChildEvolution(children[0], bodyHost);
    } catch (err) {
      evolutionHost.appendChild(h('div', { class: 'insight-card CRITICAL' }, `Erro ao calcular a evolução escolar: ${err.message}`));
    }
  }

  async function paintChildEvolution(childName, bodyHost) {
    clear(bodyHost);
    bodyHost.appendChild(h('div', { class: 'loading-spinner' }, 'Calculando…'));
    try {
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
    } catch (err) {
      clear(bodyHost);
      bodyHost.appendChild(h('div', { class: 'insight-card CRITICAL' }, `Erro ao montar os gráficos: ${err.message}`));
    }
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
  await paintMaintenance();
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

// Detects, on preview, whether the file is a full school-system backup
// ({ tables: {...} }, wrapped as a 1-element array by the generic JSON
// parser) or a plain flat Acompanha+ export, and routes to the matching
// connector automatically — a single import path instead of two cards that
// looked similar enough to pick the wrong one from.
function detectConnector(rows) {
  const isBackup = Array.isArray(rows) && rows.length === 1 && rows[0] && typeof rows[0] === 'object' && rows[0].tables;
  return isBackup ? schoolBackupConnector : acompanhaPlusConnector;
}

function smartImportCard({ onImported }) {
  const statusHost = h('div', {});
  const fileInput = h('input', { type: 'file', accept: '.json,.csv' });
  const previewHost = h('div', { style: 'margin-top:10px' });

  async function paint() {
    clear(statusHost);
    const [eventsStatus, gradesStatus] = await Promise.all([acompanhaPlusConnector.getStatus(), schoolBackupConnector.getStatus()]);
    const total = (eventsStatus.totalRecordsImported || 0) + (gradesStatus.totalRecordsImported || 0);
    statusHost.appendChild(h('div', { class: 'flex-between' }, [
      h('strong', {}, 'Acompanha+'),
      badge(total ? 'CONNECTED' : 'DISCONNECTED', total ? 'success' : 'neutral'),
    ]));
    statusHost.appendChild(h('p', { class: 'muted' }, `${eventsStatus.totalRecordsImported || 0} evento(s) de acompanhamento · ${gradesStatus.totalRecordsImported || 0} registro(s) de notas/avaliações.`));
    statusHost.appendChild(h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-sm', onClick: async () => {
        await acompanhaPlusConnector.importDemoDataset();
        await schoolBackupConnector.importDemoDataset();
        reportSuccess('Dataset demo importado (eventos + notas escolares).');
        paint();
        if (onImported) await onImported();
      } }, 'Importar dataset demo'),
    ]));
  }

  function previewRow(item) {
    const summary = Object.entries(item.mapped)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
    return h('div', { class: 'flex-between', style: 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px' }, [
      h('span', {}, summary || '(sem prévia)'),
      item.isDuplicate ? badge('Duplicado — será ignorado', 'warning') : badge('Novo', 'success'),
    ]);
  }

  async function onPreview(e) {
    const file = fileInput.files[0];
    if (!file) return reportError(new Error('Escolha um arquivo .json ou .csv.'));
    const previewBtn = e.currentTarget;
    previewBtn.disabled = true;
    previewBtn.textContent = 'Analisando arquivo…';
    try {
      const text = await readFileAsText(file);
      const rows = detectFormatAndParse(file.name, text);
      const connector = detectConnector(rows);
      const previewed = await connector.preview(rows);
      const newCount = previewed.filter((p) => !p.isDuplicate).length;
      clear(previewHost);
      const kindLabel = connector === schoolBackupConnector ? 'backup completo da escola' : 'eventos Acompanha+';
      previewHost.appendChild(h('p', { class: 'muted' }, `Formato detectado: ${kindLabel} · ${previewed.length} registro(s) · ${newCount} novo(s) · ${previewed.length - newCount} duplicado(s).`));
      previewHost.appendChild(h('div', {}, previewed.slice(0, 10).map(previewRow)));
      if (previewed.length > 10) previewHost.appendChild(h('div', { class: 'muted', style: 'padding-top:6px' }, `+ ${previewed.length - 10} outro(s)…`));
      const confirmBtn = h('button', {
        class: 'btn btn-primary btn-sm', style: 'margin-top:10px',
        onClick: async (e2) => {
          const btn = e2.currentTarget;
          btn.disabled = true;
          btn.textContent = `Importando 0/${previewed.length}…`;
          try {
            const result = await connector.import(rows, {
              onProgress: throttleProgress((done, total) => { btn.textContent = `Importando ${done}/${total}…`; }),
            });
            reportSuccess(`${connector.label}: ${result.imported} importado(s), ${result.skipped} ignorado(s) (duplicado/erro).`);
            fileInput.value = '';
            clear(previewHost);
            paint();
            if (onImported) await onImported();
          } catch (err) {
            reportError(err, connector.id);
            btn.disabled = false;
            btn.textContent = 'Confirmar importação';
          }
        },
      }, 'Confirmar importação');
      previewHost.appendChild(confirmBtn);
    } catch (err) {
      reportError(err, 'acompanha-smart-import');
    } finally {
      previewBtn.disabled = false;
      previewBtn.textContent = 'Pré-visualizar';
    }
  }

  paint();
  return h('div', { class: 'card' }, [
    statusHost,
    h('hr', { class: 'sep' }),
    h('div', { class: 'form-field' }, [h('label', {}, 'Importar arquivo (.json ou .csv)'), fileInput]),
    h('p', { class: 'muted', style: 'font-size:12px' }, 'Aceita tanto uma exportação do Acompanha+ quanto o backup completo do sistema da escola — o formato é detectado automaticamente, sem precisar escolher.'),
    h('button', { class: 'btn btn-sm', onClick: onPreview }, 'Pré-visualizar'),
    previewHost,
  ]);
}
