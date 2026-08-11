import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, emptyState } from '../ui/components/misc.js';
import { radarChart } from '../ui/components/chart.js';
import { computeEnglishDashboard } from '../core/englishIntelligence.js';
import { renderForm } from '../ui/components/form.js';
import { reportSuccess } from '../core/errorHandler.js';
import { getActiveAiProvider } from '../core/ai/aiProviderFactory.js';

const SESSION_TYPES = ['CASUAL', 'WORK', 'MEETING', 'INTERVIEW', 'TECHNICAL', 'LEADERSHIP'];
const SHADOW_MODES = [
  { key: 'Casual', scenario: 'CASUAL' }, { key: 'American Office', scenario: 'WORK' }, { key: 'DevOps War Room', scenario: 'TECHNICAL' },
  { key: 'Security Incident', scenario: 'TECHNICAL' }, { key: 'Leadership', scenario: 'LEADERSHIP' },
  { key: 'Interview Pressure', scenario: 'INTERVIEW' }, { key: 'Accent Training', scenario: 'CASUAL' },
];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🗣️ English Intelligence'));
  container.appendChild(h('p', {}, 'Dashboard de inglês, sessões de imersão, simuladores, erros recorrentes e Shadow English.'));

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', render: renderDashboard },
    { key: 'immersion', label: 'English Immersion', render: (c) => renderEntityCrud(c, sessionConfig(user)) },
    { key: 'simulators', label: 'Simulators', render: renderSimulators },
    { key: 'weakness', label: 'Weakness Engine', render: (c) => renderWeakness(c, user) },
    { key: 'shadow', label: 'Shadow English', render: renderShadow },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderDashboard(c) {
  clear(c);
  const d = await computeEnglishDashboard();
  c.appendChild(h('div', { class: 'grid grid-3' }, [
    statTile('Sessões (30 dias)', d.sessions.length), statTile('Minutos de exposição', d.exposureMinutes), statTile('Total de sessões', d.totalSessions),
  ]));
  c.appendChild(sectionTitle('📡 Radar de competências'));
  c.appendChild(h('div', { class: 'card' }, radarChart(d.dims.map((x) => ({ label: x.label, value: x.value })))));
  c.appendChild(h('p', { class: 'muted' }, 'Grammar/Vocabulary/Fluency/Listening/Pronunciation são auto-avaliados (edite em Self-Assessment abaixo); Exposure é calculado a partir dos minutos de imersão dos últimos 30 dias.'));
  c.appendChild(await renderSelfAssessmentForm());
}

async function renderSelfAssessmentForm() {
  const repo = createEntityService('english.selfAssessment');
  const existing = (await repo.findAll())[0];
  const fields = ['grammar', 'vocabulary', 'fluency', 'listening', 'pronunciation', 'responsespeed'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), type: 'number', hint: '0-100' }));
  const { node, getValues } = renderForm(fields, existing ? existing.data : {});
  const wrap = h('div', { class: 'card', style: 'margin-top:14px' }, [h('h3', {}, 'Self-Assessment'), node, h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
    const values = getValues();
    if (existing) await repo.update(existing.id, values); else await repo.create(values, { visibility: 'PRIVATE' });
    reportSuccess('Auto-avaliação salva.');
  } }, 'Salvar'))]);
  return wrap;
}

async function renderSimulators(c) {
  clear(c);
  c.appendChild(sectionTitle('🎭 Meeting & Interview Simulator'));
  c.appendChild(h('p', {}, 'Simulação local baseada em cenários — pronta para IA (LLM) real futuramente.'));
  const scenarioSelect = h('select', {}, SESSION_TYPES.map((t) => h('option', { value: t }, t)));
  const output = h('div', { style: 'margin-top:14px' });
  const btn = h('button', { class: 'btn btn-primary', onClick: async () => {
    const provider = await getActiveAiProvider();
    const turns = await provider.simulateConversation(scenarioSelect.value, [1, 2, 3]);
    clear(output);
    output.appendChild(h('div', { class: 'card' }, turns.map((t, i) => h('p', {}, `${i + 1}. ${t}`))));
    output.appendChild(h('button', { class: 'btn btn-sm', style: 'margin-top:8px', onClick: async () => {
      const repo = createEntityService('english.session');
      await repo.create({ type: scenarioSelect.value, date: new Date().toISOString().slice(0, 10), durationMinutes: 15, notes: 'Sessão de simulador' }, { visibility: 'PRIVATE' });
      reportSuccess('Sessão registrada no English Immersion.');
    } }, '+ Registrar como sessão de 15min'));
  } }, 'Gerar simulação');
  c.appendChild(h('div', { class: 'card' }, [h('label', {}, 'Cenário'), scenarioSelect, h('div', { style: 'margin-top:10px' }, btn)]));
  c.appendChild(output);
}

async function renderWeakness(c, user) {
  clear(c);
  c.appendChild(sectionTitle('🔁 Top recurring mistakes'));
  const d = await computeEnglishDashboard();
  c.appendChild(d.topMistakes.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Categoria'), h('th', {}, 'Ocorrências')])),
    h('tbody', {}, d.topMistakes.map((m) => h('tr', {}, [h('td', {}, m.category), h('td', {}, m.count)]))),
  ])) : emptyState({ icon: '✅', title: 'Nenhum erro registrado ainda' }));
  const host = h('div', { style: 'margin-top:20px' });
  c.appendChild(host);
  await renderEntityCrud(host, mistakeConfig(user));
}

async function renderShadow(c) {
  clear(c);
  c.appendChild(sectionTitle('🕶️ Shadow English — modos'));
  c.appendChild(h('div', { class: 'grid grid-3' }, SHADOW_MODES.map((m) => h('div', { class: 'card' }, [
    h('strong', {}, m.key),
    h('p', {}, `Cenário base: ${m.scenario}`),
    h('button', { class: 'btn btn-sm', onClick: async () => {
      const provider = await getActiveAiProvider();
      const turns = await provider.simulateConversation(m.scenario, [1, 2]);
      alert(`${m.key}:\n\n${turns.join('\n')}`);
    } }, 'Praticar agora'),
  ]))));
}

function sessionConfig(user) {
  return {
    entityType: 'english.session', title: 'English Immersion — Sessões', icon: '🎧', user, permissionModule: 'english', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'type', label: 'Tipo', type: 'select', options: SESSION_TYPES, required: true },
      { key: 'date', label: 'Data', type: 'date', required: true }, { key: 'durationMinutes', label: 'Duração (min)', type: 'number', required: true },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [{ key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') }, { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) }, { key: 'durationMinutes', label: 'Duração (min)' }],
    sortBy: (a, b) => (b.date || '').localeCompare(a.date || ''),
    emptyTitle: 'Nenhuma sessão registrada',
  };
}

function mistakeConfig(user) {
  return {
    entityType: 'english.mistake', title: 'Erros Registrados', icon: '📝', user, permissionModule: 'english', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'originalPhrase', label: 'Frase original', required: true, full: true },
      { key: 'correction', label: 'Correção', required: true, full: true },
      { key: 'category', label: 'Categoria', type: 'select', options: ['Grammar', 'Vocabulary', 'Pronunciation', 'Word Order', 'Preposition', 'Tense'], required: true },
      { key: 'date', label: 'Data', type: 'date' },
    ],
    columns: [{ key: 'originalPhrase', label: 'Original' }, { key: 'correction', label: 'Correção' }, { key: 'category', label: 'Categoria', render: (r) => badge(r.category, 'neutral') }],
    emptyTitle: 'Nenhum erro registrado',
  };
}
registerSeeder(async ({ dielly }) => {
  const session = createEntityService('english.session');
  const mistake = createEntityService('english.mistake');
  const assessment = createEntityService('english.selfAssessment');
  const today = new Date().toISOString().slice(0, 10);
  const priv = { visibility: 'PRIVATE' };
  await session.create({ type: 'WORK', date: today, durationMinutes: 30, notes: '[DEMO] Reunião em inglês' }, priv);
  await session.create({ type: 'TECHNICAL', date: today, durationMinutes: 20, notes: '[DEMO] Leitura técnica' }, priv);
  await mistake.create({ originalPhrase: 'I have 30 years old', correction: 'I am 30 years old', category: 'Grammar', date: today }, priv);
  await mistake.create({ originalPhrase: 'Advices', correction: 'Advice (uncountable)', category: 'Vocabulary', date: today }, priv);
  await mistake.create({ originalPhrase: 'I am agree', correction: 'I agree', category: 'Grammar', date: today }, priv);
  await assessment.create({ grammar: 68, vocabulary: 72, fluency: 60, listening: 75, pronunciation: 58, responsespeed: 62 }, priv);
});
