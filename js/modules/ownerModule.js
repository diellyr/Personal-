import { h, clear } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { sectionTitle, badge, emptyState } from '../ui/components/misc.js';
import { getAiSettings, saveAiSettings } from '../core/ai/aiProviderFactory.js';
import { renderForm } from '../ui/components/form.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { corporateCollectorConnector } from '../core/connectors/corporateCollectorConnector.js';
import { jiraConnector } from '../core/connectors/jiraConnector.js';
import { readFileAsText, detectFormatAndParse } from '../core/importUtils.js';
import { connectorCard } from './importExportCenter.js';

export async function render(container, ctx) {
  const { subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '⚙️ Owner'));
  container.appendChild(h('p', {}, 'Área exclusiva do OWNER: configurações de IA e coleta de dados corporativos.'));
  const tabs = [
    { key: 'ai', label: 'AI Settings', render: renderAiSettings },
    { key: 'corporate', label: 'Corporate Collector', render: renderCorporateCollector },
    { key: 'jira', label: 'Jira Import', render: renderJiraImport },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderJiraImport(c) {
  clear(c);
  c.appendChild(sectionTitle('🎫 Jira Import'));
  c.appendChild(h('p', {}, 'Importe direto o CSV exportado do seu board Jira ("Export Excel CSV (all fields)") — filtre por pessoas e status na hora de exportar do próprio Jira, e suba o arquivo aqui. Os tickets aparecem em Work Intelligence → Jira Intelligence e no card "Trabalho" do Dashboards. Assim como o Corporate Collector, os registros são sempre PRIVATE por padrão.'));
  c.appendChild(connectorCard(jiraConnector));
}

async function renderAiSettings(c) {
  clear(c);
  const settings = await getAiSettings();
  c.appendChild(sectionTitle('🤖 AI Provider'));
  c.appendChild(h('p', {}, 'Hoje o app roda 100% com um motor de regras local (MockAIProvider) — nenhuma chamada externa, nenhuma chave necessária. Esta tela já está pronta para conectar um provedor real (OpenAI/Claude/Gemini) futuramente.'));
  const { node, getValues } = renderForm([
    { key: 'provider', label: 'Provider', type: 'select', options: ['MOCK', 'OPENAI', 'CLAUDE', 'GEMINI'], default: settings.provider },
    { key: 'model', label: 'Model', default: settings.model },
    { key: 'temperature', label: 'Temperature', type: 'number', default: settings.temperature },
    { key: 'apiKey', label: 'API Key (não será exibida novamente após salvar)', type: 'password', hint: settings.hasApiKey ? `Atual: ${settings.apiKeyMasked}` : 'Nenhuma chave configurada' },
  ], {});
  c.appendChild(h('div', { class: 'card' }, [
    node,
    h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
      const values = getValues();
      if (values.provider !== 'MOCK') {
        reportError(new Error('Somente MOCK está implementado nesta versão. A configuração será salva, mas o app continuará usando o motor local até um provider real ser implementado.'));
      }
      await saveAiSettings(values);
      reportSuccess('Configuração de IA salva.');
      renderAiSettings(c);
    } }, 'Salvar')),
    h('p', { class: 'field-hint', style: 'margin-top:10px' }, 'Aviso: o armazenamento local (IndexedDB) não equivale a um cofre de segredos de backend. Chaves reais devem ser configuradas apenas após a migração para Supabase (ver docs/SECURITY.md).'),
  ]));
}

async function renderCorporateCollector(c) {
  clear(c);
  c.appendChild(sectionTitle('🏢 Corporate Collector'));
  c.appendChild(h('p', {}, 'Único caminho de entrada para dados de Jira/Calendário corporativo: upload de work-summary.json/.csv → CorporateSanitizer → work.activity (sempre PRIVATE por padrão). Nunca acessa o ambiente corporativo diretamente.'));
  const status = await corporateCollectorConnector.getStatus();
  c.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'flex-between' }, [h('strong', {}, 'Status'), badge(status.status, status.status === 'CONNECTED' ? 'success' : 'neutral')]),
    h('p', { class: 'muted' }, `${status.totalRecordsImported || 0} registro(s) importado(s) no total.`),
    h('button', { class: 'btn btn-sm', onClick: async () => { await corporateCollectorConnector.importDemoDataset(); reportSuccess('Dataset demo sanitizado e importado.'); renderCorporateCollector(c); } }, 'Importar dataset demo'),
  ]));

  const fileInput = h('input', { type: 'file', accept: '.json,.csv' });
  const previewHost = h('div', { style: 'margin-top:12px' });
  c.appendChild(h('div', { class: 'card', style: 'margin-top:14px' }, [
    h('h3', {}, 'Upload diário: work-summary.json / work-summary.csv'),
    h('div', { class: 'form-field' }, [h('label', {}, 'Arquivo'), fileInput]),
    h('button', { class: 'btn', onClick: async () => {
      const file = fileInput.files[0];
      if (!file) return reportError(new Error('Selecione um arquivo.'));
      const text = await readFileAsText(file);
      const rows = detectFormatAndParse(file.name, text);
      const preview = await corporateCollectorConnector.preview(rows);
      clear(previewHost);
      previewHost.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
        h('thead', {}, h('tr', {}, [h('th', {}, 'Categoria (sanitizada)'), h('th', {}, 'Tempo (min)'), h('th', {}, 'Duplicado?')])),
        h('tbody', {}, preview.map((p) => h('tr', {}, [h('td', {}, p.mapped.category), h('td', {}, p.mapped.timeMinutes), h('td', {}, p.isDuplicate ? badge('Sim — será ignorado', 'warning') : badge('Novo', 'success'))]))),
      ])));
      previewHost.appendChild(h('button', { class: 'btn btn-primary', style: 'margin-top:10px', onClick: async () => {
        const result = await corporateCollectorConnector.import(rows);
        reportSuccess(`${result.imported} importado(s), ${result.skipped} ignorado(s) (duplicado/erro).`);
      } }, 'Confirmar importação'));
    } }, 'Pré-visualizar (sanitizado)'),
    previewHost,
  ]));
}
