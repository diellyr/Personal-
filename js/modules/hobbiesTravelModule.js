import { h, clear, fmtDate, fmtMoney } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud, createEntityService } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, progressBar, emptyState } from '../ui/components/misc.js';
import { canViewResource } from '../core/permissions.js';
import { todayIso, daysBetween } from '../core/dateUtils.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🧳 Hobbies, Lazer & Viagens'));
  container.appendChild(h('p', {}, 'Interesses, passeios, restaurantes, wishlist e planejamento completo de viagens.'));

  const tabs = [
    { key: 'hobbies', label: 'Hobbies & Lazer', render: (c) => renderEntityCrud(c, hobbiesConfig(user)) },
    { key: 'trips', label: 'Viagens', render: (c) => renderEntityCrud(c, tripsConfig(user), { onAfterChange: null }) },
    { key: 'trip-dashboard', label: 'Trip Dashboard', render: renderTripDashboard },
  ];
  container.appendChild(renderTabs(tabs, subview));

  async function renderTripDashboard(c) {
    clear(c);
    const repo = createEntityService('travel.trip');
    const all = (await repo.findAll()).filter((r) => canViewResource(user, r));
    if (!all.length) {
      c.appendChild(emptyState({ icon: '🧳', title: 'Nenhuma viagem criada', message: 'Planeje sua primeira viagem na aba Viagens.', actionLabel: 'Planejar primeira viagem', onAction: () => c.parentElement.querySelector('.tab:nth-child(2)')?.click() }));
      return;
    }
    const today = todayIso();
    all.sort((a, b) => (a.data.startDate || '').localeCompare(b.data.startDate || ''));
    all.forEach((trip) => {
      const d = trip.data;
      const planned = Number(d.plannedBudget || 0);
      const actual = Number(d.actualCost || 0);
      const remaining = planned - actual;
      const daysUntil = d.startDate ? daysBetween(today, d.startDate) : null;
      const checklistLines = (d.checklist || '').split('\n').filter((l) => l.trim());
      const pending = checklistLines.filter((l) => !l.trim().startsWith('[x]')).length;
      c.appendChild(h('div', { class: 'card', style: 'margin-bottom:16px' }, [
        h('div', { class: 'flex-between' }, [
          h('h3', {}, `${d.destination}${d.country ? ', ' + d.country : ''}`),
          badge(d.status, d.status === 'CONCLUIDA' ? 'success' : d.status === 'CANCELADA' ? 'critical' : 'info'),
        ]),
        h('p', {}, `${fmtDate(d.startDate)} → ${fmtDate(d.endDate)}${daysUntil !== null && daysUntil >= 0 ? ` · faltam ${daysUntil} dia(s)` : ''} · ${d.people || '—'}`),
        h('div', { class: 'grid grid-4' }, [
          statTile('Orçamento planejado', fmtMoney(planned)),
          statTile('Custo real', fmtMoney(actual)),
          statTile('Restante', fmtMoney(remaining), remaining < 0 ? 'acima do orçamento' : 'dentro do orçamento'),
          statTile('Checklist pendente', pending, `${checklistLines.length} item(ns)`),
        ]),
        planned > 0 ? progressBar((actual / planned) * 100) : null,
      ]));
    });
  }
}

function hobbiesConfig(user) {
  return {
    entityType: 'hobbies.item', title: 'Hobbies & Lazer', icon: '🎨', user, permissionModule: 'hobbies', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['HOBBY', 'RESTAURANTE', 'PASSEIO', 'WISHLIST', 'EXPERIENCIA'], required: true },
      { key: 'category', label: 'Categoria', type: 'select', options: ['INDIVIDUAL', 'CASAL', 'FAMILIA', 'AMIGOS', 'IGREJA'], required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['WISHLIST', 'PLANEJADO', 'REALIZADO'], default: 'WISHLIST' },
      { key: 'notes', label: 'Notas', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: 'Nome' }, { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') },
      { key: 'category', label: 'Categoria' }, { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'REALIZADO' ? 'success' : 'neutral') },
    ],
    filters: [{ key: 'category', label: 'Categoria', options: ['INDIVIDUAL', 'CASAL', 'FAMILIA', 'AMIGOS', 'IGREJA'] }],
    emptyTitle: 'Nada registrado ainda',
  };
}

function tripsConfig(user) {
  return {
    entityType: 'travel.trip', title: 'Viagens', icon: '✈️', user, permissionModule: 'hobbies', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'destination', label: 'Destino', required: true }, { key: 'country', label: 'País' }, { key: 'city', label: 'Cidade' },
      { key: 'startDate', label: 'Data de início', type: 'date', required: true }, { key: 'endDate', label: 'Data de fim', type: 'date' },
      { key: 'people', label: 'Pessoas' }, { key: 'status', label: 'Status', type: 'select', options: ['PLANEJADA', 'CONFIRMADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'], default: 'PLANEJADA' },
      { key: 'plannedBudget', label: 'Orçamento planejado', type: 'money' }, { key: 'actualCost', label: 'Custo real', type: 'money' },
      { key: 'transport', label: 'Transporte' }, { key: 'accommodation', label: 'Hospedagem' },
      { key: 'insurance', label: 'Seguro' }, { key: 'reservations', label: 'Reservas' },
      { key: 'itinerary', label: 'Roteiro', type: 'textarea', full: true },
      { key: 'attractions', label: 'Atrações', type: 'textarea', full: true },
      { key: 'documents', label: 'Documentos necessários', type: 'textarea', full: true },
      { key: 'checklist', label: 'Checklist (uma linha por item, "[x]" quando concluído)', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'destination', label: 'Destino' }, { key: 'startDate', label: 'Início', render: (r) => fmtDate(r.startDate) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'CONCLUIDA' ? 'success' : 'neutral') },
      { key: 'plannedBudget', label: 'Orçamento', render: (r) => fmtMoney(r.plannedBudget) },
    ],
    sortBy: (a, b) => (a.startDate || '').localeCompare(b.startDate || ''),
    emptyTitle: 'Nenhuma viagem criada', emptyMessage: 'Planeje sua primeira viagem.',
  };
}

registerSeeder(async () => {
  const hobby = createEntityService('hobbies.item');
  const trip = createEntityService('travel.trip');
  const today = new Date().toISOString().slice(0, 10);
  const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  await hobby.create({ name: 'Trilha de fim de semana (DEMO)', type: 'PASSEIO', category: 'FAMILIA', status: 'WISHLIST' }, { visibility: 'FAMILY' });
  await hobby.create({ name: 'Restaurante japonês novo (DEMO)', type: 'RESTAURANTE', category: 'CASAL', status: 'WISHLIST' }, { visibility: 'FAMILY' });
  await hobby.create({ name: 'Fotografia (DEMO)', type: 'HOBBY', category: 'INDIVIDUAL', status: 'PLANEJADO' }, { visibility: 'PRIVATE' });

  await trip.create({
    destination: 'Orlando (DEMO)', country: 'EUA', city: 'Orlando', startDate: future(90), endDate: future(100), people: 'Família toda',
    status: 'PLANEJADA', plannedBudget: 25000, actualCost: 8000, transport: 'Voo direto', accommodation: 'Airbnb',
    itinerary: 'Dia 1: chegada\nDia 2: parques\nDia 3: descanso', checklist: '[x] Passaportes em dia\n[ ] Comprar ingressos\n[ ] Seguro viagem',
  }, { visibility: 'FAMILY' });
});
