import { h, clear, fmtDate } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, sectionTitle, emptyState } from '../ui/components/misc.js';
import { openModal, closeModal } from '../ui/components/modal.js';
import { renderForm } from '../ui/components/form.js';
import { reportSuccess } from '../core/errorHandler.js';
import { todayIso } from '../core/dateUtils.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🧭 Decision Intelligence'));
  container.appendChild(h('p', {}, 'Decision Journal — registre o contexto de decisões importantes e revise previsão × resultado.'));

  const tabs = [
    { key: 'journal', label: 'Decision Journal', render: (c) => renderEntityCrud(c, decisionConfig(user)) },
    { key: 'review', label: 'Decision Review', render: renderReview },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

async function renderReview(c) {
  clear(c);
  const repo = createEntityService('decisions.decision');
  const all = await repo.findAll();
  const today = todayIso();
  const due = all.filter((r) => r.data.reviewDate && r.data.reviewDate <= today && !r.data.actualResult);
  const reviewed = all.filter((r) => r.data.actualResult);
  c.appendChild(sectionTitle('🔎 Prontas para revisão'));
  c.appendChild(due.length ? h('div', {}, due.map((r) => reviewCard(r, repo, c))) : emptyState({ icon: '✅', title: 'Nada pendente de revisão' }));
  c.appendChild(sectionTitle('📚 Histórico revisado'));
  c.appendChild(reviewed.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Decisão'), h('th', {}, 'Esperado'), h('th', {}, 'Resultado real'), h('th', {}, 'Aprendizado')])),
    h('tbody', {}, reviewed.map((r) => h('tr', {}, [h('td', {}, r.data.decision), h('td', {}, r.data.expectedResult || '—'), h('td', {}, r.data.actualResult || '—'), h('td', {}, r.data.lessons || '—')]))),
  ])) : emptyState({ icon: '📚', title: 'Nenhuma decisão revisada ainda' }));
}

function reviewCard(record, repo, container) {
  const card = h('div', { class: 'card', style: 'margin-bottom:10px' }, [
    h('div', { class: 'flex-between' }, [h('strong', {}, record.data.decision), badge(fmtDate(record.data.reviewDate), 'warning')]),
    h('p', {}, `Esperado: ${record.data.expectedResult || '—'}`),
    h('button', { class: 'btn btn-sm btn-primary', onClick: () => openReviewForm(record, repo, container) }, 'Registrar resultado real'),
  ]);
  return card;
}

function openReviewForm(record, repo, container) {
  const { node, getValues } = renderForm([
    { key: 'actualResult', label: 'Resultado real', type: 'textarea', full: true, required: true },
    { key: 'lessons', label: 'Aprendizado', type: 'textarea', full: true },
  ], {});
  const body = h('div', {}, [node, h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
    const values = getValues();
    await repo.update(record.id, values);
    closeModal();
    reportSuccess('Revisão registrada.');
    renderReview(container);
  } }, 'Salvar'))]);
  openModal({ title: `Revisar: ${record.data.decision}`, bodyNode: body });
}

function decisionConfig(user) {
  return {
    entityType: 'decisions.decision', title: 'Decision Journal', icon: '🧭', user, permissionModule: 'intelligence', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'decision', label: 'Decisão', required: true, full: true },
      { key: 'context', label: 'Contexto', type: 'textarea', full: true },
      { key: 'options', label: 'Opções consideradas', type: 'textarea' }, { key: 'opportunityCost', label: 'Custo de oportunidade', type: 'textarea' },
      { key: 'benefits', label: 'Benefícios', type: 'textarea' }, { key: 'risks', label: 'Riscos', type: 'textarea' },
      { key: 'assumptions', label: 'Premissas', type: 'textarea' }, { key: 'choice', label: 'Escolha final', full: true },
      { key: 'expectedResult', label: 'Resultado esperado', type: 'textarea', full: true },
      { key: 'reviewDate', label: 'Data de revisão', type: 'date' },
    ],
    columns: [{ key: 'decision', label: 'Decisão' }, { key: 'choice', label: 'Escolha' }, { key: 'reviewDate', label: 'Revisão em', render: (r) => fmtDate(r.reviewDate) }],
    emptyTitle: 'Nenhuma decisão registrada',
  };
}

registerSeeder(async () => {
  const repo = createEntityService('decisions.decision');
  const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  await repo.create({
    decision: 'Aceitar proposta de trabalho remoto (DEMO)', context: '[DEMO] Oferta de trabalho 100% remoto vs híbrido',
    options: 'Aceitar remoto; permanecer híbrido', benefits: 'Mais tempo com família', risks: 'Menos visibilidade',
    choice: 'Aceitar remoto', expectedResult: 'Mais equilíbrio e produtividade', reviewDate: future(-5),
  }, { visibility: 'PRIVATE' });
});
