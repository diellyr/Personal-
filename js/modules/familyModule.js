import { h, clear } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { fmtDate } from '../ui/dom.js';
import { badge, sectionTitle } from '../ui/components/misc.js';

const STATUS_OPTS = ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '👨‍👩‍👧‍👦 Família'));
  container.appendChild(h('p', {}, 'Casal, filhos, pais/mãe e casa — tudo em um só lugar, com visibilidade compartilhada entre Dielly e a esposa.'));

  const tabs = [
    { key: 'spouse', label: 'Esposo(a) / Casal', render: (c) => renderEntityCrud(c, spouseConfig(user)) },
    { key: 'children', label: 'Filhos', render: (c) => renderEntityCrud(c, childrenConfig(user)) },
    { key: 'events', label: 'Compromissos dos filhos', render: (c) => renderEntityCrud(c, childEventsConfig(user)) },
    { key: 'parents', label: 'Pais / Mãe', render: (c) => renderEntityCrud(c, parentsConfig(user)) },
    { key: 'home', label: 'Casa', render: (c) => renderEntityCrud(c, homeConfig(user)) },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

function spouseConfig(user) {
  return {
    entityType: 'family.spouse', title: 'Planejamento do Casal', icon: '💑', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['COMPROMISSO', 'DATA_ESPECIAL', 'ATIVIDADE', 'DECISAO', 'OBJETIVO'], required: true },
      { key: 'date', label: 'Data', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS, default: 'PLANEJADO' },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Título' },
      { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: 'Nenhum item de planejamento do casal', emptyMessage: 'Registre compromissos, datas especiais e objetivos do casal.',
  };
}

function childrenConfig(user) {
  return {
    entityType: 'family.child', title: 'Filhos', icon: '🧒', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'birthDate', label: 'Data de nascimento', type: 'date' },
      { key: 'school', label: 'Escola' },
      { key: 'grade', label: 'Série/Turma' },
      { key: 'healthNotes', label: 'Saúde (administrativo)', type: 'textarea' },
      { key: 'developmentNotes', label: 'Desenvolvimento', type: 'textarea' },
      { key: 'documents', label: 'Documentos', type: 'textarea', hint: 'RG, CPF, cartão de vacina, etc.' },
      { key: 'observations', label: 'Observações', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'birthDate', label: 'Nascimento', render: (r) => fmtDate(r.birthDate) },
      { key: 'school', label: 'Escola' },
      { key: 'grade', label: 'Série' },
    ],
    emptyTitle: 'Nenhum filho cadastrado', emptyMessage: 'Cadastre seus filhos para acompanhar escola, saúde, desenvolvimento e documentos.',
  };
}

function childEventsConfig(user) {
  return {
    entityType: 'family.childEvent', title: 'Compromissos e Atividades dos Filhos', icon: '🎒', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'childName', label: 'Filho(a)', required: true },
      { key: 'title', label: 'Título', required: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['COMPROMISSO', 'ATIVIDADE', 'SAUDE', 'DOCUMENTO', 'TEMPO_DE_QUALIDADE'], required: true },
      { key: 'date', label: 'Data', type: 'date', required: true },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'childName', label: 'Filho(a)' },
      { key: 'title', label: 'Título' },
      { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
    ],
    sortBy: (a, b) => (a.date || '').localeCompare(b.date || ''),
    emptyTitle: 'Nenhum compromisso registrado', emptyMessage: 'Registre compromissos escolares, atividades e tempo de qualidade.',
  };
}

function parentsConfig(user) {
  return {
    entityType: 'family.parentCare', title: 'Pais / Mãe', icon: '🧓', user, permissionModule: 'family',
    defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['COMPROMISSO', 'NECESSIDADE', 'ACOMPANHAMENTO', 'DOCUMENTO', 'DECISAO'], required: true },
      { key: 'date', label: 'Data', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS, default: 'PLANEJADO' },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Título' },
      { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: 'Nada registrado ainda', emptyMessage: 'Acompanhe compromissos e necessidades relacionadas aos seus pais/mãe.',
  };
}

function homeConfig(user) {
  return {
    entityType: 'family.home', title: 'Casa', icon: '🏡', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'category', label: 'Categoria', type: 'select', options: ['MANUTENCAO', 'COMPRAS', 'DOCUMENTOS', 'CONTAS', 'REPAROS', 'RESPONSABILIDADES'], required: true },
      { key: 'responsible', label: 'Responsável', type: 'select', options: ['DIELLY', 'ESPOSA', 'AMBOS'], default: 'AMBOS' },
      { key: 'dueDate', label: 'Prazo', type: 'date' },
      { key: 'cost', label: 'Custo estimado', type: 'money' },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS, default: 'PLANEJADO' },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Título' },
      { key: 'category', label: 'Categoria', render: (r) => badge(r.category, 'neutral') },
      { key: 'responsible', label: 'Responsável' },
      { key: 'dueDate', label: 'Prazo', render: (r) => fmtDate(r.dueDate) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: 'Nenhuma tarefa da casa', emptyMessage: 'Manutenção, compras, documentos e contas da casa.',
  };
}

// ---- Demo seed ----
registerSeeder(async ({ dielly, esposa }) => {
  const { EntityRepository } = await import('../core/entityRepository.js');
  const spouse = new EntityRepository('family.spouse');
  const child = new EntityRepository('family.child');
  const childEvent = new EntityRepository('family.childEvent');
  const parentCare = new EntityRepository('family.parentCare');
  const home = new EntityRepository('family.home');
  const today = new Date().toISOString().slice(0, 10);

  await spouse.create({ title: 'Noite de encontro semanal', type: 'ATIVIDADE', date: today, status: 'PLANEJADO', notes: '[DEMO] Jantar só nós dois, sexta-feira.' }, { visibility: 'FAMILY' });
  await spouse.create({ title: 'Planejar aniversário de casamento', type: 'DATA_ESPECIAL', date: today, status: 'EM_ANDAMENTO', notes: '[DEMO] Reservar restaurante.' }, { visibility: 'FAMILY' });

  const sofia = await child.create({ name: 'Sofia (DEMO)', birthDate: '2016-03-12', school: 'Colégio Horizonte', grade: '5º ano', healthNotes: '[DEMO] Consulta oftalmo em dia.', developmentNotes: '[DEMO] Ótimo progresso em leitura.', observations: '' }, { visibility: 'FAMILY' });
  const theo = await child.create({ name: 'Theo (DEMO)', birthDate: '2019-07-02', school: 'Colégio Horizonte', grade: 'Infantil 3', healthNotes: '[DEMO] Vacinas em dia.', developmentNotes: '[DEMO] Desenvolvendo fala.', observations: '' }, { visibility: 'FAMILY' });

  await childEvent.create({ childName: 'Sofia (DEMO)', title: 'Reunião de pais', type: 'COMPROMISSO', date: today, notes: '[DEMO]' }, { visibility: 'FAMILY' });
  await childEvent.create({ childName: 'Theo (DEMO)', title: 'Consulta pediatra', type: 'SAUDE', date: today, notes: '[DEMO]' }, { visibility: 'FAMILY' });

  await parentCare.create({ title: 'Ligar para mãe sobre exames (DEMO)', type: 'ACOMPANHAMENTO', date: today, status: 'PLANEJADO', notes: '[DEMO]' }, { visibility: 'PRIVATE' });

  await home.create({ title: 'Trocar filtro do ar condicionado (DEMO)', category: 'MANUTENCAO', responsible: 'DIELLY', dueDate: today, cost: 120, status: 'PLANEJADO' }, { visibility: 'FAMILY' });
  await home.create({ title: 'Renovar seguro residencial (DEMO)', category: 'DOCUMENTOS', responsible: 'AMBOS', dueDate: today, cost: 890, status: 'PLANEJADO' }, { visibility: 'FAMILY' });
  await home.create({ title: 'Lista de compras do mês (DEMO)', category: 'COMPRAS', responsible: 'ESPOSA', status: 'EM_ANDAMENTO' }, { visibility: 'FAMILY' });
});
