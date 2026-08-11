import { h, clear, fmtDate } from '../ui/dom.js';
import { listAllTasks, createTask, updateTask, deleteTask, TASK_STATUSES } from '../core/tasks.js';
import { renderTable } from '../ui/components/table.js';
import { renderForm } from '../ui/components/form.js';
import { openModal, closeModal, confirmDialog } from '../ui/components/modal.js';
import { badge, sectionTitle } from '../ui/components/misc.js';
import { userRepository } from '../core/entities/userRepository.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { MODULES } from '../core/moduleRegistry.js';

const MODULE_OPTS = [...new Set(MODULES.map((m) => m.permission))];

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  const users = await userRepository.findAll();
  const userOpts = users.map((u) => ({ value: u.id, label: u.displayName }));

  container.appendChild(h('h1', {}, '✅ Tasks'));
  container.appendChild(h('p', {}, 'Sistema central de tarefas — usado por todos os módulos.'));

  const state = { module: '', status: '', owner: '' };
  const toolbar = h('div', { class: 'filters-bar' });
  const moduleSel = h('select', {}, [h('option', { value: '' }, 'Todos os módulos'), ...MODULE_OPTS.map((m) => h('option', { value: m }, m))]);
  const statusSel = h('select', {}, [h('option', { value: '' }, 'Todos os status'), ...TASK_STATUSES.map((s) => h('option', { value: s }, s))]);
  const ownerSel = h('select', {}, [h('option', { value: '' }, 'Todos os donos'), ...userOpts.map((o) => h('option', { value: o.value }, o.label))]);
  moduleSel.addEventListener('change', () => { state.module = moduleSel.value; paint(); });
  statusSel.addEventListener('change', () => { state.status = statusSel.value; paint(); });
  ownerSel.addEventListener('change', () => { state.owner = ownerSel.value; paint(); });
  toolbar.appendChild(moduleSel); toolbar.appendChild(statusSel); toolbar.appendChild(ownerSel);
  toolbar.appendChild(h('button', { class: 'btn btn-primary', style: 'margin-left:auto', onClick: () => openForm(null) }, '+ Nova tarefa'));
  container.appendChild(toolbar);
  const listHost = h('div', {});
  container.appendChild(listHost);

  async function paint() {
    clear(listHost);
    let tasks = await listAllTasks();
    if (state.module) tasks = tasks.filter((t) => t.module === state.module);
    if (state.status) tasks = tasks.filter((t) => t.status === state.status);
    if (state.owner) tasks = tasks.filter((t) => t.owner === state.owner);
    tasks.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    listHost.appendChild(renderTable([
      { key: 'title', label: 'Título' },
      { key: 'module', label: 'Módulo', render: (r) => badge(r.module, 'neutral') },
      { key: 'priority', label: 'Prioridade', render: (r) => badge(r.priority, r.priority === 'CRITICAL' ? 'critical' : r.priority === 'HIGH' ? 'warning' : 'neutral') },
      { key: 'owner', label: 'Dono', render: (r) => users.find((u) => u.id === r.owner)?.displayName || '—' },
      { key: 'dueDate', label: 'Prazo', render: (r) => fmtDate(r.dueDate) },
      { key: 'status', label: 'Status', render: (r) => badge(r.status, r.status === 'DONE' ? 'success' : r.status === 'CANCELED' ? 'neutral' : 'info') },
    ], tasks, {
      emptyTitle: 'Nenhuma tarefa', emptyMessage: 'Crie sua primeira tarefa.',
      emptyAction: h('button', { class: 'btn btn-primary', onClick: () => openForm(null) }, '+ Nova tarefa'),
      onRowClick: (row) => openForm(row),
      actions: (row) => h('div', { class: 'flex gap-8' }, [
        row.status !== 'DONE' ? h('button', { class: 'btn btn-sm', onClick: async (e) => { e.stopPropagation(); await updateTask(row.id, { status: 'DONE' }); paint(); } }, 'Concluir') : null,
        h('button', { class: 'btn btn-sm btn-danger', onClick: async (e) => { e.stopPropagation(); const ok = await confirmDialog({ message: `Excluir tarefa "${row.title}"?` }); if (ok) { await deleteTask(row.id); paint(); } } }, 'Excluir'),
      ]),
    }));
  }

  function openForm(row) {
    const { node, getValues, validate } = renderForm([
      { key: 'title', label: 'Título', required: true, full: true },
      { key: 'module', label: 'Módulo', type: 'select', options: MODULE_OPTS, required: true },
      { key: 'priority', label: 'Prioridade', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
      { key: 'status', label: 'Status', type: 'select', options: TASK_STATUSES, default: 'TODO' },
      { key: 'owner', label: 'Dono', type: 'select', options: userOpts, default: user.id },
      { key: 'dueDate', label: 'Prazo', type: 'date' },
    ], row || {});
    const body = h('div', {}, [node, h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
      const errors = validate();
      if (errors.length) return reportError(new Error(errors.join(' ')));
      const values = getValues();
      try {
        if (row) await updateTask(row.id, values); else await createTask({ ...values, source: 'MANUAL' });
        closeModal();
        reportSuccess(row ? 'Tarefa atualizada.' : 'Tarefa criada.');
        paint();
      } catch (err) { reportError(err, 'tasks'); }
    } }, row ? 'Salvar' : 'Criar'))]);
    openModal({ title: row ? 'Editar tarefa' : 'Nova tarefa', bodyNode: body });
  }

  await paint();
}
