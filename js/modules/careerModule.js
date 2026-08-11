import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, emptyState } from '../ui/components/misc.js';
import { barChart } from '../ui/components/chart.js';
import { computeCareerEvidenceScores, computeCareerDrift } from '../core/careerIntelligence.js';
import { renderForm } from '../ui/components/form.js';
import { reportSuccess } from '../core/errorHandler.js';

const SKILL_OPTS = ['AWS', 'Cloud Security', 'DevOps', 'Linux', 'Terraform', 'Kubernetes', 'Automation', 'Governance', 'Security Advisory', 'Stakeholder Management', 'Leadership'];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🚀 Career Intelligence'));
  container.appendChild(h('p', {}, 'Dashboard de carreira, achievements, evidências por competência e detecção de desvio de rota.'));

  const tabs = [
    { key: 'dashboard', label: 'Career Dashboard', render: renderDashboard },
    { key: 'achievements', label: 'Achievement Tracker', render: (c) => renderEntityCrud(c, achievementConfig(user)) },
    { key: 'evidence', label: 'Career Evidence Engine', render: renderEvidence },
    { key: 'drift', label: 'Career Drift Detector', render: renderDrift },
    { key: 'objective', label: 'Objetivo de Carreira', render: renderObjective },
    { key: 'vault', label: 'Career Vault', render: renderVault },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderDashboard(c) {
  clear(c);
  const repo = createEntityService('career.achievement');
  const items = await repo.findAll();
  const scores = await computeCareerEvidenceScores();
  c.appendChild(h('div', { class: 'grid grid-3' }, [
    statTile('Achievements registrados', items.length),
    statTile('Competências com evidência', scores.length),
    statTile('Top competência', scores[0]?.skill || '—', scores[0] ? `${scores[0].count} evidência(s)` : ''),
  ]));
  c.appendChild(sectionTitle('🏆 Achievements recentes'));
  const recent = [...items].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || '')).slice(0, 5);
  c.appendChild(recent.length ? h('div', {}, recent.map((a) => h('div', { class: 'card', style: 'margin-bottom:8px' }, [
    h('div', { class: 'flex-between' }, [h('strong', {}, a.data.title), badge(fmtDate(a.data.date), 'neutral')]),
    h('p', {}, a.data.result),
  ]))) : emptyState({ icon: '🏆', title: 'Nenhum achievement registrado ainda' }));
}

async function renderEvidence(c) {
  clear(c);
  const scores = await computeCareerEvidenceScores();
  c.appendChild(sectionTitle('📈 Score por competência'));
  c.appendChild(scores.length ? h('div', { class: 'card' }, barChart(scores.map((s) => ({ label: s.skill, value: s.score })), { valueFmt: (v) => `${v}` })) : emptyState({ icon: '📈', title: 'Sem evidências ainda', message: 'Registre achievements com competências associadas.' }));
}

async function renderDrift(c) {
  clear(c);
  const drift = await computeCareerDrift();
  if (!drift.hasObjective) {
    c.appendChild(emptyState({ icon: '🧭', title: 'Nenhum objetivo de carreira definido', message: 'Defina seu objetivo na aba "Objetivo de Carreira" para ativar o detector de desvio.' }));
    return;
  }
  c.appendChild(sectionTitle('🧭 Objetivo vs. Atividade recente (90 dias)'));
  c.appendChild(h('div', { class: 'card' }, [h('strong', {}, drift.objective.targetRole), h('p', {}, `Skills-alvo: ${drift.targetSkills.join(', ')}`)]));
  c.appendChild(sectionTitle('⚠️ Gaps detectados'));
  c.appendChild(drift.gaps.length
    ? h('div', {}, drift.gaps.map((g) => h('div', { class: 'insight-card WARNING' }, [h('div', { class: 'insight-title' }, g), h('div', { class: 'muted' }, 'Nenhum achievement recente evidencia esta competência-alvo.')])))
    : emptyState({ icon: '✅', title: 'Sem desvio detectado', message: 'Suas atividades recentes cobrem seu objetivo de carreira.' }));
}

async function renderObjective(c) {
  clear(c);
  const repo = createEntityService('career.objective');
  const existing = (await repo.findAll())[0];
  const { node, getValues } = renderForm([
    { key: 'targetRole', label: 'Cargo/objetivo alvo', required: true, full: true },
    { key: 'targetSkills', label: 'Skills-alvo (separadas por vírgula)', full: true },
    { key: 'notes', label: 'Notas', type: 'textarea', full: true },
  ], existing ? existing.data : {});
  c.appendChild(node);
  c.appendChild(h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
    const values = getValues();
    if (existing) await repo.update(existing.id, values); else await repo.create(values, { visibility: 'PRIVATE' });
    reportSuccess('Objetivo de carreira salvo.');
  } }, 'Salvar objetivo')));
}

async function renderVault(c) {
  clear(c);
  const repo = createEntityService('career.achievement');
  const items = await repo.findAll();
  const state = { skill: '', text: '' };
  const filterBar = h('div', { class: 'filters-bar' }, [
    (() => { const i = h('input', { type: 'text', placeholder: 'Buscar…' }); i.addEventListener('input', () => { state.text = i.value.toLowerCase(); paint(); }); return i; })(),
    (() => { const s = h('select', {}, [h('option', { value: '' }, 'Todas as competências'), ...SKILL_OPTS.map((sk) => h('option', { value: sk }, sk))]); s.addEventListener('change', () => { state.skill = s.value; paint(); }); return s; })(),
  ]);
  const listHost = h('div', {});
  c.appendChild(sectionTitle('🗄️ Career Vault'));
  c.appendChild(h('p', {}, 'Banco de evidências profissionais — filtrável, pronto para gerar currículo, entrevista, promotion case ou LinkedIn.'));
  c.appendChild(filterBar);
  c.appendChild(listHost);
  function paint() {
    clear(listHost);
    const filtered = items.filter((a) => {
      if (state.skill && !(a.data.competencies || '').includes(state.skill)) return false;
      if (state.text && !JSON.stringify(a.data).toLowerCase().includes(state.text)) return false;
      return true;
    });
    listHost.appendChild(filtered.length ? h('div', {}, filtered.map((a) => h('div', { class: 'card', style: 'margin-bottom:10px' }, [
      h('div', { class: 'flex-between' }, [h('strong', {}, a.data.title), badge(fmtDate(a.data.date), 'neutral')]),
      h('p', {}, `Problema: ${a.data.problem || '—'}`),
      h('p', {}, `Ação: ${a.data.action || '—'}`),
      h('p', {}, `Impacto: ${a.data.impact || '—'} · Métrica: ${a.data.metric || '—'}`),
      h('div', { class: 'pill-list' }, (a.data.competencies || '').split(',').filter(Boolean).map((s) => badge(s.trim(), 'info'))),
    ]))) : emptyState({ icon: '🗄️', title: 'Nenhum resultado' }));
  }
  paint();
}

function achievementConfig(user) {
  return {
    entityType: 'career.achievement', title: 'Achievement Tracker', icon: '🏆', user, permissionModule: 'career', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'problem', label: 'Problema', type: 'textarea' }, { key: 'action', label: 'Ação', type: 'textarea' },
      { key: 'contribution', label: 'Contribuição', type: 'textarea' }, { key: 'technology', label: 'Tecnologia' },
      { key: 'impact', label: 'Impacto' }, { key: 'result', label: 'Resultado', type: 'textarea' },
      { key: 'metric', label: 'Métrica' }, { key: 'competencies', label: 'Competências (separadas por vírgula)', full: true, hint: SKILL_OPTS.join(', ') },
      { key: 'date', label: 'Data', type: 'date' },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'technology', label: 'Tecnologia' },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
    ],
    sortBy: (a, b) => (b.date || '').localeCompare(a.date || ''),
    emptyTitle: 'Nenhum achievement registrado',
  };
}

registerSeeder(async () => {
  const repo = createEntityService('career.achievement');
  const objective = createEntityService('career.objective');
  const today = new Date().toISOString().slice(0, 10);
  const priv = { visibility: 'PRIVATE' };
  await repo.create({ title: 'Redução de findings críticos em 40% (DEMO)', problem: 'Alto volume de vulnerabilidades críticas em produção', action: 'Implementei pipeline automatizado de triagem', contribution: 'Liderei o esforço multi-time', technology: 'AWS, Terraform', impact: 'Redução de 40% em findings críticos', result: 'Ambiente mais seguro', metric: '40% redução em 90 dias', competencies: 'AWS,Cloud Security,Automation', date: today }, priv);
  await repo.create({ title: 'Governança de segurança para 3 unidades de negócio (DEMO)', problem: 'Falta de padrão entre unidades', action: 'Criei framework de governança único', contribution: 'Ownership total', technology: 'Governance frameworks', impact: 'Padronização', result: 'Auditoria aprovada sem ressalvas', metric: '0 findings de auditoria', competencies: 'Governance,Security Advisory,Stakeholder Management', date: today }, priv);
  await objective.create({ targetRole: 'Head of Cloud Security (DEMO)', targetSkills: 'Leadership,Kubernetes,Governance,Security Advisory', notes: '[DEMO] Objetivo de 18 meses.' }, priv);
});
