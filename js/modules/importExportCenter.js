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

const CONNECTORS = [acompanhaPlusConnector, expansionConnector, plumaConnector, jobSourceConnector];

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
    h('button', { class: 'btn', onClick: async () => {
      const file = fileInput.files[0];
      if (!file) return reportError(new Error('Selecione um arquivo.'));
      try {
        const text = await readFileAsText(file);
        const rows = detectFormatAndParse(file.name, text);
        clear(previewHost);
        previewHost.appendChild(h('p', {}, `${rows.length} registro(s) detectado(s) no arquivo.`));
        previewHost.appendChild(h('button', { class: 'btn btn-primary', onClick: async () => {
          const n = await importIntoEntityType(entitySelect.value, rows);
          reportSuccess(`${n} registro(s) importado(s) em ${entitySelect.value}.`);
        } }, 'Confirmar importação'));
      } catch (err) {
        reportError(err, 'import');
      }
    } }, 'Pré-visualizar'),
    previewHost,
  ]));
}

function connectorCard(conn) {
  const statusHost = h('div', {});
  async function paint() {
    clear(statusHost);
    const status = await conn.getStatus();
    statusHost.appendChild(h('div', { class: 'flex-between' }, [
      h('strong', {}, conn.label),
      badge(status.status, status.status === 'CONNECTED' ? 'success' : status.status === 'ERROR' ? 'critical' : 'neutral'),
    ]));
    statusHost.appendChild(h('p', { class: 'muted' }, `${status.totalRecordsImported || 0} registro(s) importado(s) no total.`));
    statusHost.appendChild(h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-sm', onClick: async () => { await conn.importDemoDataset(); reportSuccess(`${conn.label}: dataset demo importado.`); paint(); } }, 'Importar dataset demo'),
    ]));
  }
  paint();
  return h('div', { class: 'card' }, statusHost);
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
