import { h, clear, fmtDate } from '../ui/dom.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge } from '../ui/components/misc.js';

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🩺 Saúde'));
  container.appendChild(h('p', {}, 'Organização administrativa: consultas, exames, medicamentos, hábitos e lembretes. Não é um módulo de diagnóstico médico.'));
  const host = h('div', {});
  container.appendChild(host);
  await renderEntityCrud(host, {
    entityType: 'health.record', title: 'Registros de Saúde', icon: '🩺', user, permissionModule: 'health', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['CONSULTA', 'EXAME', 'MEDICAMENTO', 'ATIVIDADE_FISICA', 'HABITO', 'LEMBRETE'], required: true },
      { key: 'date', label: 'Data', type: 'date' },
      { key: 'provider', label: 'Profissional/Local' },
      { key: 'status', label: 'Status', type: 'select', options: ['AGENDADO', 'CONCLUIDO', 'RECORRENTE'], default: 'AGENDADO' },
      { key: 'notes', label: 'Notas / documentos', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'title', label: 'Título' }, { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) }, { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDO' ? 'success' : 'neutral') },
    ],
    filters: [{ key: 'type', label: 'Tipo', options: ['CONSULTA', 'EXAME', 'MEDICAMENTO', 'ATIVIDADE_FISICA', 'HABITO', 'LEMBRETE'] }],
    emptyTitle: 'Nenhum registro de saúde', emptyMessage: 'Consultas, exames, medicamentos e hábitos.',
  });
}

registerSeeder(async () => {
  const { EntityRepository } = await import('../core/entityRepository.js');
  const repo = new EntityRepository('health.record');
  const today = new Date().toISOString().slice(0, 10);
  await repo.create({ title: 'Check-up anual (DEMO)', type: 'CONSULTA', date: today, provider: 'Dr. Ricardo', status: 'AGENDADO' }, { visibility: 'PRIVATE' });
  await repo.create({ title: 'Corrida 3x/semana (DEMO)', type: 'ATIVIDADE_FISICA', status: 'RECORRENTE' }, { visibility: 'PRIVATE' });
  await repo.create({ title: 'Exame de sangue (DEMO)', type: 'EXAME', date: today, status: 'CONCLUIDO', notes: '[DEMO] Resultados normais.' }, { visibility: 'PRIVATE' });
});
