import { h, clear, fmtDate } from '../ui/dom.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { listByModule } from '../core/tasks.js';
import { sectionTitle, statTile, badge, emptyState } from '../ui/components/misc.js';
import { todayIso, daysBetween } from '../core/dateUtils.js';
import { navigate } from '../core/router.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';

async function safeFindAll(entityType, user) {
  const all = await new EntityRepository(entityType).findAll();
  return all.filter((r) => canViewResource(user, r));
}

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  const root = h('div', {});
  container.appendChild(root);
  root.appendChild(h('div', { class: 'loading-spinner' }, 'Carregando Family Hub…'));

  const today = todayIso();
  const [spouse, children, childEvents, home, familyTasks, acompanha, connMeta] = await Promise.all([
    safeFindAll('family.spouse', user),
    safeFindAll('family.child', user),
    safeFindAll('family.childEvent', user),
    safeFindAll('family.home', user),
    listByModule('family'),
    safeFindAll('family.acompanhaEvent', user),
    connectorMetaRepository.get('acompanha-plus'),
  ]);

  clear(root);
  root.appendChild(h('h1', {}, '🧩 Family Hub'));
  root.appendChild(h('p', {}, 'Painel compartilhado entre Dielly e a esposa: agenda, filhos, tarefas, contas e alertas da família.'));

  root.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile('Filhos', children.length),
    statTile('Compromissos abertos', childEvents.filter((e) => e.data.date >= today).length),
    statTile('Tarefas da casa pendentes', home.filter((hI) => hI.data.status !== 'CONCLUIDO').length),
    statTile('Tarefas familiares abertas', familyTasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED').length),
  ]));

  root.appendChild(await familyLoadWidget(familyTasks, home));

  root.appendChild(sectionTitle('📅 Próximos compromissos da família'));
  const upcoming = [
    ...spouse.filter((s) => s.data.date >= today).map((s) => ({ date: s.data.date, title: s.data.title, tag: 'Casal' })),
    ...childEvents.filter((e) => e.data.date >= today).map((e) => ({ date: e.data.date, title: `${e.data.childName}: ${e.data.title}`, tag: 'Filhos' })),
    ...home.filter((hI) => hI.data.dueDate && hI.data.dueDate >= today && hI.data.status !== 'CONCLUIDO').map((hI) => ({ date: hI.data.dueDate, title: hI.data.title, tag: 'Casa' })),
  ].sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 10);
  root.appendChild(upcoming.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
        h('thead', {}, h('tr', {}, [h('th', {}, 'Data'), h('th', {}, 'Item'), h('th', {}, 'Área')])),
        h('tbody', {}, upcoming.map((u) => h('tr', {}, [h('td', {}, fmtDate(u.date)), h('td', {}, u.title), h('td', {}, badge(u.tag, 'neutral'))]))),
      ]))
    : emptyState({ icon: '📅', title: 'Nada agendado', message: 'Sem compromissos futuros registrados para a família.' }));

  root.appendChild(sectionTitle('🎓 Acompanha+ School (integração escolar)'));
  root.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'flex-between' }, [
      h('div', {}, [
        h('strong', {}, connMeta ? `Status: ${connMeta.status}` : 'Ainda não conectado'),
        h('p', {}, connMeta ? `${connMeta.totalRecordsImported || 0} registro(s) importado(s) · última importação: ${connMeta.lastImportAt ? fmtDate(connMeta.lastImportAt) : '—'}` : 'Importe dados do Acompanha+ (JSON/CSV) no módulo dedicado.'),
      ]),
      h('button', { class: 'btn', onClick: () => navigate('/acompanha-plus') }, 'Abrir Acompanha+ School →'),
    ]),
  ]));
  if (acompanha.length) {
    root.appendChild(h('div', { class: 'table-wrap', style: 'margin-top:10px' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Filho(a)'), h('th', {}, 'Categoria'), h('th', {}, 'Evolução'), h('th', {}, 'Alerta')])),
      h('tbody', {}, acompanha.slice(0, 8).map((a) => h('tr', {}, [h('td', {}, a.data.childName), h('td', {}, a.data.category), h('td', {}, a.data.evolution || '—'), h('td', {}, a.data.alert ? badge(a.data.alert, 'warning') : '—')]))),
    ])));
  }
}

async function familyLoadWidget(familyTasks, home) {
  const openTasks = familyTasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED');
  const { userRepository } = await import('../core/entities/userRepository.js');
  const users = await userRepository.findAll();
  const byOwner = {};
  openTasks.forEach((t) => { byOwner[t.owner] = (byOwner[t.owner] || 0) + 1; });
  home.filter((hI) => hI.data.status !== 'CONCLUIDO').forEach((hI) => {
    const resp = hI.data.responsible;
    if (resp === 'AMBOS') return;
    const uid = users.find((u) => u.displayName.toUpperCase().includes(resp === 'DIELLY' ? 'DIELLY' : 'ESPOSA'))?.id;
    if (uid) byOwner[uid] = (byOwner[uid] || 0) + 1;
  });
  const rows = users.map((u) => ({ name: u.displayName, count: byOwner[u.id] || 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));
  const imbalance = rows.length === 2 && Math.abs(rows[0].count - rows[1].count) >= 4;

  return h('div', { class: 'card', style: 'margin:18px 0' }, [
    h('div', { class: 'flex-between' }, [h('h3', {}, '⚖️ Family Load'), imbalance ? badge('Possível desequilíbrio', 'warning') : badge('Equilibrado', 'success')]),
    h('p', {}, 'Distribuição de responsabilidades e tarefas familiares por pessoa (não é uma competição — é um radar de sobrecarga).'),
    h('div', { class: 'grid grid-2' }, rows.map((r) => h('div', {}, [
      h('div', { class: 'flex-between', style: 'margin-bottom:4px' }, [h('span', {}, r.name), h('span', { class: 'muted' }, `${r.count} responsabilidade(s)`)]),
      h('div', { class: 'progress-bar' }, h('div', { style: `width:${(r.count / max) * 100}%` })),
    ]))),
  ]);
}
