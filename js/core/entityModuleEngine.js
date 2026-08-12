import { h, clear } from '../ui/dom.js';
import { EntityRepository } from './entityRepository.js';
import { can, canViewResource, VISIBILITY } from './permissions.js';
import { renderTable } from '../ui/components/table.js';
import { renderKanban } from '../ui/components/kanban.js';
import { renderForm } from '../ui/components/form.js';
import { openModal, closeModal, confirmDialog } from '../ui/components/modal.js';
import { emptyState, sectionTitle, badge, demoTag } from '../ui/components/misc.js';
import { logAudit } from './audit.js';
import { reportSuccess, reportError } from './errorHandler.js';
import { t } from './i18n.js';

/**
 * Config-driven CRUD (+ optional Kanban) engine shared by most domain
 * modules (family, church, finance, hobbies, health, career, jobs,
 * english, studies, CRM, decisions, pains, ideas, memory, projects,
 * goals...). This is the "no bespoke UI per entity" simplification
 * documented in docs/ARCHITECTURE.md — it still gives every module real
 * persistence, real forms, real filtering, and real permission checks.
 */
export function createEntityService(entityType) {
  return new EntityRepository(entityType);
}

function toRow(record) {
  return { id: record.id, ...record.data, visibility: record.visibility, owner_id: record.owner_id, created_at: record.created_at, updated_at: record.updated_at, source: record.source, _record: record };
}

export async function renderEntityCrud(container, opts) {
  const {
    entityType, title, icon = '📄', fields, columns, user, permissionModule,
    kanban, defaultVisibility = 'FAMILY', filters = [], emptyTitle, emptyMessage,
    onAfterChange, extraToolbar, subtitle, sortBy,
  } = opts;
  const repo = createEntityService(entityType);
  const canCreate = await can(user, permissionModule, 'CREATE');
  const canEdit = await can(user, permissionModule, 'EDIT');
  const canDelete = await can(user, permissionModule, 'DELETE');

  const state = { search: '', filterValues: {} };

  const wrap = h('div', {});
  const toolbar = h('div', { class: 'filters-bar' });
  const searchInput = h('input', { type: 'text', placeholder: t('crud.search'), style: 'min-width:200px' });
  searchInput.addEventListener('input', () => { state.search = searchInput.value.toLowerCase(); paint(); });
  toolbar.appendChild(searchInput);

  filters.forEach((f) => {
    const sel = h('select', {}, [h('option', { value: '' }, f.label), ...f.options.map((o) => h('option', { value: o.value ?? o }, o.label ?? o))]);
    sel.addEventListener('change', () => { state.filterValues[f.key] = sel.value; paint(); });
    toolbar.appendChild(sel);
  });
  if (extraToolbar) toolbar.appendChild(extraToolbar);
  if (canCreate) {
    toolbar.appendChild(h('button', { class: 'btn btn-primary', style: 'margin-left:auto', onClick: () => openEditor(null) }, t('crud.new')));
  }

  const listHost = h('div', {});
  wrap.appendChild(sectionTitle(`${icon} ${title}`, subtitle ? h('span', { class: 'muted' }, subtitle) : null));
  wrap.appendChild(toolbar);
  wrap.appendChild(listHost);
  clear(container);
  container.appendChild(wrap);

  function matchesFilters(row) {
    for (const f of filters) {
      const v = state.filterValues[f.key];
      if (v && String(row[f.key]) !== String(v)) return false;
    }
    if (state.search) {
      const hay = JSON.stringify(row).toLowerCase();
      if (!hay.includes(state.search)) return false;
    }
    return true;
  }

  async function paint() {
    clear(listHost);
    const records = await repo.findAll();
    const visible = records.filter((r) => canViewResource(user, r));
    let rows = visible.map(toRow).filter(matchesFilters);
    if (sortBy) rows = rows.sort(sortBy);

    if (kanban) {
      if (rows.length === 0) {
        listHost.appendChild(emptyState({ icon: '🗂️', title: emptyTitle || t('crud.nothingYet'), message: emptyMessage, actionLabel: canCreate ? t('crud.createFirst') : null, onAction: () => openEditor(null) }));
        return;
      }
      const board = renderKanban({
        columns: kanban.columns,
        items: rows,
        statusKey: kanban.statusKey || 'status',
        renderCard: (row) => {
          const card = h('div', { onClick: () => openEditor(row) }, [
            h('div', { style: 'font-weight:650;margin-bottom:4px' }, kanban.cardTitle(row)),
            kanban.cardSubtitle ? h('div', { class: 'muted' }, kanban.cardSubtitle(row)) : null,
          ]);
          return card;
        },
        onDrop: async (row, newStatus) => {
          if (!canEdit) return reportError(new Error(t('crud.noPermissionMove')));
          await repo.update(row.id, { [kanban.statusKey || 'status']: newStatus });
          await logAudit('UPDATE', entityType, `Status -> ${newStatus}`, row.id);
          paint();
          if (onAfterChange) onAfterChange();
        },
      });
      listHost.appendChild(board);
      return;
    }

    listHost.appendChild(renderTable(columns, rows, {
      emptyTitle: emptyTitle || t('crud.noRecordsYet'),
      emptyMessage,
      emptyAction: canCreate ? h('button', { class: 'btn btn-primary', onClick: () => openEditor(null) }, t('crud.createFirst')) : null,
      onRowClick: (row) => openEditor(row),
      actions: (row) => h('div', { class: 'flex gap-8' }, [
        canDelete ? h('button', { class: 'btn btn-sm btn-danger', onClick: async (e) => { e.stopPropagation(); await removeRow(row); } }, t('crud.delete')) : null,
      ]),
    }));
  }

  async function removeRow(row) {
    const ok = await confirmDialog({ message: t('crud.deleteConfirm', { name: (columns[0] && (row[columns[0].key] || '')) || row.id }) });
    if (!ok) return;
    await repo.softDelete(row.id);
    await logAudit('DELETE', entityType, 'Record soft-deleted', row.id);
    reportSuccess(t('crud.deleted'));
    paint();
    if (onAfterChange) onAfterChange();
  }

  function openEditor(row) {
    const isNew = !row;
    if (isNew && !canCreate) return;
    if (!isNew && !canEdit) return;
    const formFields = [...fields];
    if (opts.visibilityEnabled !== false) {
      formFields.push({
        key: 'visibility', label: t('crud.visibility'), type: 'select', full: true,
        options: [{ value: VISIBILITY.PRIVATE, label: t('crud.private') }, { value: VISIBILITY.FAMILY, label: t('crud.family') }],
        default: row ? row.visibility : defaultVisibility,
      });
    }
    const { node, getValues, validate } = renderForm(formFields, row || {});
    const body = h('div', {}, [
      node,
      h('div', { class: 'form-actions' }, [
        h('button', { class: 'btn', onClick: closeModal }, t('crud.cancel')),
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const errors = validate();
          if (errors.length) return reportError(new Error(errors.join(' ')));
          const values = getValues();
          const { visibility, ...data } = values;
          try {
            if (isNew) {
              const rec = await repo.create(data, { visibility: visibility || defaultVisibility });
              await logAudit('CREATE', entityType, `Created ${title}`, rec.id);
              reportSuccess(t('crud.createdSuccess'));
            } else {
              await repo.update(row.id, data, { visibility: visibility || row.visibility });
              await logAudit('UPDATE', entityType, `Updated ${title}`, row.id);
              reportSuccess(t('crud.updatedSuccess'));
            }
            closeModal();
            paint();
            if (onAfterChange) onAfterChange();
          } catch (err) {
            reportError(err, entityType);
          }
        } }, isNew ? t('crud.create') : t('crud.save')),
      ]),
    ]);
    openModal({ title: isNew ? t('crud.newTitle', { title }) : t('crud.editTitle', { title }), bodyNode: body, width: 620 });
  }

  await paint();
  return { repaint: paint, repo };
}
