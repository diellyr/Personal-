import { h, clear } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { fmtDate } from '../ui/dom.js';
import { badge, sectionTitle } from '../ui/components/misc.js';
import { t } from '../core/i18n.js';

const STATUS_OPTS = ['PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, t('family.title')));
  container.appendChild(h('p', {}, t('family.subtitle')));

  const tabs = [
    { key: 'spouse', label: t('family.tabSpouse'), render: (c) => renderEntityCrud(c, spouseConfig(user)) },
    { key: 'children', label: t('family.tabChildren'), render: (c) => renderEntityCrud(c, childrenConfig(user)) },
    { key: 'events', label: t('family.tabEvents'), render: (c) => renderEntityCrud(c, childEventsConfig(user)) },
    { key: 'parents', label: t('family.tabParents'), render: (c) => renderEntityCrud(c, parentsConfig(user)) },
    { key: 'home', label: t('family.tabHome'), render: (c) => renderEntityCrud(c, homeConfig(user)) },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

function spouseConfig(user) {
  return {
    entityType: 'family.spouse', title: t('family.spouseCrudTitle'), icon: '💑', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: t('family.fieldTitle'), required: true, full: true },
      { key: 'type', label: t('family.fieldType'), type: 'select', options: ['COMPROMISSO', 'DATA_ESPECIAL', 'ATIVIDADE', 'DECISAO', 'OBJETIVO'], required: true },
      { key: 'date', label: t('family.fieldDate'), type: 'date' },
      { key: 'status', label: t('family.fieldStatus'), type: 'select', options: STATUS_OPTS, default: 'PLANEJADO' },
      { key: 'notes', label: t('family.fieldNotes'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: t('family.fieldTitle') },
      { key: 'type', label: t('family.fieldType'), render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: t('family.fieldDate'), render: (r) => fmtDate(r.date) },
      { key: 'status', label: t('family.fieldStatus'), render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: t('family.emptySpouse'), emptyMessage: t('family.emptySpouseMsg'),
  };
}

function childrenConfig(user) {
  return {
    entityType: 'family.child', title: t('family.childrenCrudTitle'), icon: '🧒', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: t('family.fieldName'), required: true },
      { key: 'birthDate', label: t('family.fieldBirthDate'), type: 'date' },
      { key: 'school', label: t('family.fieldSchool') },
      { key: 'grade', label: t('family.fieldGrade') },
      { key: 'healthNotes', label: t('family.fieldHealthNotes'), type: 'textarea' },
      { key: 'developmentNotes', label: t('family.fieldDevelopmentNotes'), type: 'textarea' },
      { key: 'documents', label: t('family.fieldDocuments'), type: 'textarea', hint: t('family.fieldDocumentsHint') },
      { key: 'observations', label: t('family.fieldObservations'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: t('family.fieldName') },
      { key: 'birthDate', label: t('family.colBirth'), render: (r) => fmtDate(r.birthDate) },
      { key: 'school', label: t('family.fieldSchool') },
      { key: 'grade', label: t('family.colGrade') },
    ],
    emptyTitle: t('family.emptyChildren'), emptyMessage: t('family.emptyChildrenMsg'),
  };
}

function childEventsConfig(user) {
  return {
    entityType: 'family.childEvent', title: t('family.eventsCrudTitle'), icon: '🎒', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'childName', label: t('family.fieldChildName'), required: true },
      { key: 'title', label: t('family.fieldTitle'), required: true },
      { key: 'type', label: t('family.fieldType'), type: 'select', options: ['COMPROMISSO', 'ATIVIDADE', 'SAUDE', 'DOCUMENTO', 'TEMPO_DE_QUALIDADE'], required: true },
      { key: 'date', label: t('family.fieldDate'), type: 'date', required: true },
      { key: 'notes', label: t('family.fieldNotes'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'childName', label: t('family.fieldChildName') },
      { key: 'title', label: t('family.fieldTitle') },
      { key: 'type', label: t('family.fieldType'), render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: t('family.fieldDate'), render: (r) => fmtDate(r.date) },
    ],
    sortBy: (a, b) => (a.date || '').localeCompare(b.date || ''),
    emptyTitle: t('family.emptyEvents'), emptyMessage: t('family.emptyEventsMsg'),
  };
}

function parentsConfig(user) {
  return {
    entityType: 'family.parentCare', title: t('family.parentsCrudTitle'), icon: '🧓', user, permissionModule: 'family',
    defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: t('family.fieldTitle'), required: true, full: true },
      { key: 'type', label: t('family.fieldType'), type: 'select', options: ['COMPROMISSO', 'NECESSIDADE', 'ACOMPANHAMENTO', 'DOCUMENTO', 'DECISAO'], required: true },
      { key: 'date', label: t('family.fieldDate'), type: 'date' },
      { key: 'status', label: t('family.fieldStatus'), type: 'select', options: STATUS_OPTS, default: 'PLANEJADO' },
      { key: 'notes', label: t('family.fieldNotes'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: t('family.fieldTitle') },
      { key: 'type', label: t('family.fieldType'), render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: t('family.fieldDate'), render: (r) => fmtDate(r.date) },
      { key: 'status', label: t('family.fieldStatus'), render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: t('family.emptyParents'), emptyMessage: t('family.emptyParentsMsg'),
  };
}

function homeConfig(user) {
  return {
    entityType: 'family.home', title: t('family.homeCrudTitle'), icon: '🏡', user, permissionModule: 'family',
    defaultVisibility: 'FAMILY',
    fields: [
      { key: 'title', label: t('family.fieldTitle'), required: true, full: true },
      { key: 'category', label: t('family.fieldCategory'), type: 'select', options: ['MANUTENCAO', 'COMPRAS', 'DOCUMENTOS', 'CONTAS', 'REPAROS', 'RESPONSABILIDADES'], required: true },
      { key: 'responsible', label: t('family.fieldResponsible'), type: 'select', options: ['DIELLY', 'ESPOSA', 'AMBOS'], default: 'AMBOS' },
      { key: 'dueDate', label: t('family.fieldDueDate'), type: 'date' },
      { key: 'cost', label: t('family.fieldCost'), type: 'money' },
      { key: 'status', label: t('family.fieldStatus'), type: 'select', options: STATUS_OPTS, default: 'PLANEJADO' },
      { key: 'notes', label: t('family.fieldNotes'), type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: t('family.fieldTitle') },
      { key: 'category', label: t('family.fieldCategory'), render: (r) => badge(r.category, 'neutral') },
      { key: 'responsible', label: t('family.fieldResponsible') },
      { key: 'dueDate', label: t('family.fieldDueDate'), render: (r) => fmtDate(r.dueDate) },
      { key: 'status', label: t('family.fieldStatus'), render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    emptyTitle: t('family.emptyHome'), emptyMessage: t('family.emptyHomeMsg'),
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
