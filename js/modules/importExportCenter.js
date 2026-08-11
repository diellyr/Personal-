import { h, clear } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { sectionTitle, emptyState, badge } from '../ui/components/misc.js';
import { KNOWN_ENTITY_TYPES, exportEntityType, exportAllModules, importIntoEntityType } from '../core/exportImportService.js';
import { readFileAsText, detectFormatAndParse } from '../core/importUtils.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { acompanhaPlusConnector } from '../core/connectors/acompanhaPlusConnector.js';
import { expansionConnector } from '../core/connectors/expansionConnector.js';
import { plumaConnector } from '../core/connectors/plumaConnector.js';
import { jobSourceConnector } from '../core/connectors/jobSourceConnector.js';
import { schoolBackupConnector } from '../core/connectors/schoolBackupConnector.js';

const CONNECTORS = [acompanhaPlusConnector, schoolBackupConnector, expansionConnector, plumaConnector, jobSourceConnector];

// Progress callbacks fire once per record, which for a few thousand records
// is far more often than the DOM needs to repaint — throttle to keep large
// imports from also becoming slow because of layout thrashing.
export function throttleProgress(fn, everyMs = 150) {
  let last = 0;
  return (done, total) => {
    const now = Date.now();
    if (done === total || now - last >= everyMs) {
      last = now;
      fn(done, total);
    }
  };
}

export async function render(container, ctx) {
  const { subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '📥📤 Import / Export Center'));
  container.appendChild(h('p', {}, 'Central única de importação e exportação — JSON e CSV. Detecta duplicados por external_id antes de importar.'));
  const tabs = [
    { key: 'import', label: 'Import Center', render: renderImport },
    { key: 'export', label: 'Export Center', render: renderExport },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

function renderImport(c) {
  clear(c);
  c.appendChild(sectionTitle('🔌 Importar via Conector'));
  c.appendChild(h('div', { class: 'grid grid-2' }, CONNECTORS.map((conn) => connectorCard(conn))));
  c.appendChild(sectionTitle('📄 Importar arquivo genérico para um tipo de entidade'));
  const entitySelect = h('select', {}, KNOWN_ENTITY_TYPES.map((t) => h('option', { value: t }, t)));
  const fileInput = h('input', { type: 'file', accept: '.json,.csv' });
  const previewHost = h('div', { style: 'margin-top:12px' });
  c.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'form-row' }, [
      h('div', { class: 'form-field' }, [h('label', {}, 'Tipo de entidade'), entitySelect]),
      h('div', { class: 'form-field' }, [h('label', {}, 'Arquivo (.json ou .csv)'), fileInput]),
    ]),
    h('button', { class: 'btn', onClick: async (e) => {
      const file = fileInput.files[0];
      if (!file) return reportError(new Error('Selecione um arquivo.'));
      const previewBtn = e.currentTarget;
      previewBtn.disabled = true;
      const previewLabel = previewBtn.textContent;
      previewBtn.textContent = 'Lendo arquivo…';
      try {
        const text = await readFileAsText(file);
        const rows = detectFormatAndParse(file.name, text);
        clear(previewHost);
        previewHost.appendChild(h('p', {}, `${rows.length} registro(s) detectado(s) no arquivo.`));
        previewHost.appendChild(h('button', { class: 'btn btn-primary', onClick: async (e2) => {
          const confirmBtn = e2.currentTarget;
          confirmBtn.disabled = true;
          confirmBtn.textContent = `Importando 0/${rows.length}…`;
          try {
            const n = await importIntoEntityType(entitySelect.value, rows, {
              onProgress: throttleProgress((done, total) => { confirmBtn.textContent = `Importando ${done}/${total}…`; }),
            });
            reportSuccess(`${n} registro(s) importado(s) em ${entitySelect.value}.`);
          } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar importação';
          }
        } }, 'Confirmar importação'));
      } catch (err) {
        reportError(err, 'import');
      } finally {
        previewBtn.disabled = false;
        previewBtn.textContent = previewLabel;
      }
    } }, 'Pré-visualizar'),
    previewHost,
  ]));
}

export function connectorCard(conn, { onImported } = {}) {
  const statusHost = h('div', {});
  const fileInput = h('input', { type: 'file', accept: '.json,.csv' });
  const previewHost = h('div', { style: 'margin-top:10px' });

  async function paint() {
    clear(statusHost);
    const status = await conn.getStatus();
    statusHost.appendChild(h('div', { class: 'flex-between' }, [
      h('strong', {}, conn.label),
      badge(status.status, status.status === 'CONNECTED' ? 'success' : status.status === 'ERROR' ? 'critical' : 'neutral'),
    ]));
    statusHost.appendChild(h('p', { class: 'muted' }, `${status.totalRecordsImported || 0} registro(s) importado(s) no total.`));
    statusHost.appendChild(h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-sm', onClick: async () => { await conn.importDemoDataset(); reportSuccess(`${conn.label}: dataset demo importado.`); paint(); if (onImported) onImported(); } }, 'Importar dataset demo'),
    ]));
  }

  function previewRow(item) {
    const summary = Object.entries(item.mapped)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
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
      const previewed = await conn.preview(rows);
      const newCount = previewed.filter((p) => !p.isDuplicate).length;
      clear(previewHost);
      previewHost.appendChild(h('p', { class: 'muted' }, `${previewed.length} registro(s) no arquivo · ${newCount} novo(s) · ${previewed.length - newCount} duplicado(s).`));
      previewHost.appendChild(h('div', {}, previewed.slice(0, 10).map(previewRow)));
      if (previewed.length > 10) previewHost.appendChild(h('div', { class: 'muted', style: 'padding-top:6px' }, `+ ${previewed.length - 10} outro(s)…`));
      const confirmBtn = h('button', {
        class: 'btn btn-primary btn-sm', style: 'margin-top:10px',
        onClick: async (e2) => {
          const btn = e2.currentTarget;
          btn.disabled = true;
          btn.textContent = `Importando 0/${rows.length}…`;
          try {
            const result = await conn.import(rows, {
              onProgress: throttleProgress((done, total) => { btn.textContent = `Importando ${done}/${total}…`; }),
            });
            reportSuccess(`${conn.label}: ${result.imported} importado(s), ${result.skipped} ignorado(s) (duplicado/erro).`);
            fileInput.value = '';
            clear(previewHost);
            paint();
            if (onImported) onImported();
          } catch (err) {
            reportError(err, conn.id);
            btn.disabled = false;
            btn.textContent = 'Confirmar importação';
          }
        },
      }, 'Confirmar importação');
      previewHost.appendChild(confirmBtn);
    } catch (err) {
      reportError(err, conn.id);
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
    h('button', { class: 'btn btn-sm', onClick: onPreview }, 'Pré-visualizar'),
    previewHost,
  ]);
}

function renderExport(c) {
  clear(c);
  c.appendChild(sectionTitle('📦 Exportar tudo'));
  c.appendChild(h('div', { class: 'card' }, [
    h('p', {}, 'Exporta todos os módulos em um único arquivo JSON.'),
    h('button', { class: 'btn btn-primary', onClick: async () => { const n = await exportAllModules('json'); reportSuccess(`${n} registro(s) exportado(s).`); } }, 'Exportar tudo (JSON)'),
  ]));
  c.appendChild(sectionTitle('🧩 Exportar por módulo'));
  const entitySelect = h('select', {}, KNOWN_ENTITY_TYPES.map((t) => h('option', { value: t }, t)));
  const formatSelect = h('select', {}, [h('option', { value: 'json' }, 'JSON'), h('option', { value: 'csv' }, 'CSV')]);
  c.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'form-row' }, [
      h('div', { class: 'form-field' }, [h('label', {}, 'Tipo de entidade'), entitySelect]),
      h('div', { class: 'form-field' }, [h('label', {}, 'Formato'), formatSelect]),
    ]),
    h('button', { class: 'btn', onClick: async () => { const n = await exportEntityType(entitySelect.value, formatSelect.value); reportSuccess(`${n} registro(s) exportado(s).`); } }, 'Exportar'),
  ]));
}
