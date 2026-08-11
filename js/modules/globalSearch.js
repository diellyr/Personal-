import { h, clear } from '../ui/dom.js';
import { KNOWN_ENTITY_TYPES } from '../core/exportImportService.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource } from '../core/permissions.js';
import { listAllTasks } from '../core/tasks.js';
import { emptyState, sectionTitle, badge } from '../ui/components/misc.js';
import { navigate } from '../core/router.js';

const ENTITY_TO_ROUTE = {
  family: 'family', church: 'church', finance: 'finance', hobbies: 'hobbies-travel', travel: 'hobbies-travel',
  health: 'health', work: 'work', career: 'career', jobs: 'jobs', english: 'english', studies: 'studies',
  crm: 'crm', decisions: 'decisions', pains: 'pains', ideas: 'ideas', memory: 'memory', projects: 'projects', goals: 'goals',
};

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🔎 Global Search'));
  container.appendChild(h('p', {}, 'Pesquise em toda a aplicação — respeitando suas permissões e visibilidade dos registros.'));
  const input = h('input', { type: 'text', placeholder: 'Buscar por nome, projeto, vaga, viagem, decisão, achievement…', style: 'font-size:15px;padding:12px' });
  const resultsHost = h('div', { style: 'margin-top:18px' });
  container.appendChild(h('div', { class: 'card' }, input));
  container.appendChild(resultsHost);

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(input.value.trim(), resultsHost, user), 250);
  });
}

async function runSearch(query, host, user) {
  clear(host);
  if (query.length < 2) { host.appendChild(emptyState({ icon: '🔎', title: 'Digite ao menos 2 caracteres' })); return; }
  const lower = query.toLowerCase();
  const results = [];

  for (const entityType of KNOWN_ENTITY_TYPES) {
    const all = await new EntityRepository(entityType).findAll();
    const visible = all.filter((r) => canViewResource(user, r));
    visible.forEach((r) => {
      if (JSON.stringify(r.data).toLowerCase().includes(lower)) {
        results.push({ entityType, title: r.data.title || r.data.name || r.data.decision || r.data.destination || r.data.role || r.data.company || entityType, record: r });
      }
    });
  }
  const tasks = await listAllTasks();
  tasks.filter((t) => t.title.toLowerCase().includes(lower)).forEach((t) => results.push({ entityType: 'task', title: t.title, record: t }));

  host.appendChild(sectionTitle(`Resultados (${results.length})`));
  host.appendChild(results.length ? h('div', {}, results.slice(0, 50).map((r) => h('div', {
    class: 'card', style: 'margin-bottom:8px;cursor:pointer',
    onClick: () => { const prefix = r.entityType.split('.')[0]; const route = ENTITY_TO_ROUTE[prefix]; if (route) navigate(`/${route}`); },
  }, [
    h('div', { class: 'flex-between' }, [h('strong', {}, r.title), badge(r.entityType, 'neutral')]),
  ]))) : emptyState({ icon: '🔎', title: 'Nenhum resultado encontrado' }));
}
