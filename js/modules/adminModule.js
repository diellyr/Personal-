import { h, clear, fmtDateTime } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { sectionTitle, statTile, badge, emptyState } from '../ui/components/misc.js';
import { userRepository } from '../core/entities/userRepository.js';
import { createUser } from '../core/auth.js';
import { MODULE_PERMISSION, loadOverrides, setOverride, removeOverride, isOwner } from '../core/permissions.js';
import { MODULES } from '../core/moduleRegistry.js';
import { getDisabledModules, setModuleEnabled } from '../core/moduleManager.js';
import { openModal, closeModal, confirmDialog } from '../ui/components/modal.js';
import { renderForm } from '../ui/components/form.js';
import { reportSuccess, reportError, getErrorLog } from '../core/errorHandler.js';
import { getAuditLog } from '../core/audit.js';
import { KNOWN_ENTITY_TYPES } from '../core/exportImportService.js';
import { EntityRepository } from '../core/entityRepository.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';
import { acompanhaPlusConnector } from '../core/connectors/acompanhaPlusConnector.js';
import { expansionConnector } from '../core/connectors/expansionConnector.js';
import { plumaConnector } from '../core/connectors/plumaConnector.js';
import { corporateCollectorConnector } from '../core/connectors/corporateCollectorConnector.js';
import { jobSourceConnector } from '../core/connectors/jobSourceConnector.js';
import { storeNames, SCHEMA_VERSION } from '../core/db.js';
import { dataProvider } from '../core/indexedDbProvider.js';
import { estimateStorage } from '../core/db.js';
import { clearAllModulesData } from '../core/dataManagementService.js';
import { listRoles, listAssignableRoleNames, createRole, deleteRole, getRolePermissionsMap, setRolePermission, ALL_MODULE_KEYS } from '../core/roleService.js';

const CONNECTORS = [acompanhaPlusConnector, expansionConnector, plumaConnector, corporateCollectorConnector, jobSourceConnector];

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🛠️ Administração'));
  container.appendChild(h('p', {}, 'Usuários, módulos, permissões, privacidade, integrações, auditoria, dados e saúde do sistema.'));

  const tabs = [
    { key: 'users', label: 'User Management', render: (c) => renderUsers(c, user) },
    { key: 'modules', label: 'Module Manager', render: renderModuleManager },
    { key: 'permissions', label: 'Permission Manager', render: renderPermissionManager },
    { key: 'privacy', label: 'Privacy Manager', render: renderPrivacyManager },
    { key: 'integrations', label: 'Integration Center', render: renderIntegrations },
    { key: 'audit', label: 'Audit Log', render: renderAuditLog },
    { key: 'data', label: 'Data Management', render: (c) => renderDataManagement(c, user) },
    { key: 'health', label: 'System Health', render: renderSystemHealth },
  ];
  container.appendChild(renderTabs(tabs, subview));
}

// ---- User Management ----
async function renderUsers(c, currentUser) {
  clear(c);
  const users = await userRepository.findAll({ includeDeleted: true });
  c.appendChild(sectionTitle('👥 Usuários', isOwner(currentUser) ? h('button', { class: 'btn btn-primary', onClick: () => openUserForm(c, currentUser) }, '+ Novo usuário') : null));
  c.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Nome'), h('th', {}, 'Usuário'), h('th', {}, 'Role'), h('th', {}, 'Status'), h('th', {}, 'Último acesso'), h('th', {}, '')])),
    h('tbody', {}, users.map((u) => h('tr', {}, [
      h('td', {}, u.displayName), h('td', {}, u.username), h('td', {}, badge(u.role, u.role === 'OWNER' ? 'critical' : 'neutral')),
      h('td', {}, badge(u.status, u.status === 'ACTIVE' ? 'success' : 'neutral')),
      h('td', {}, u.lastAccessAt ? fmtDateTime(u.lastAccessAt) : '—'),
      h('td', {}, isOwner(currentUser) && u.role !== 'OWNER' ? h('button', { class: 'btn btn-sm', onClick: async () => {
        await userRepository.update(u.id, { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
        reportSuccess('Status atualizado.');
        renderUsers(c, currentUser);
      } }, u.status === 'ACTIVE' ? 'Desativar' : 'Reativar') : ''),
    ]))),
  ])));

  if (isOwner(currentUser)) {
    c.appendChild(sectionTitle('🎭 Roles', h('button', { class: 'btn btn-primary', onClick: () => openRoleForm(c, currentUser) }, '+ Nova role')));
    c.appendChild(h('p', {}, 'Roles além de OWNER/FAMILY_ADMIN/MEMBER podem ser criadas aqui. Defina os acessos de cada uma na aba Permission Manager — uma role recém-criada já aparece lá para configurar.'));
    const roles = await listRoles();
    const rows = [{ data: { name: 'OWNER', label: 'Owner', builtIn: true } }, ...roles];
    c.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Nome'), h('th', {}, 'Rótulo'), h('th', {}, 'Tipo'), h('th', {}, '')])),
      h('tbody', {}, rows.map((r) => h('tr', {}, [
        h('td', {}, r.data.name), h('td', {}, r.data.label),
        h('td', {}, r.data.builtIn ? badge('Padrão do sistema', 'neutral') : badge('Customizada', 'info')),
        h('td', {}, !r.data.builtIn ? h('button', { class: 'btn btn-sm btn-danger', onClick: async () => {
          const ok = await confirmDialog({ message: `Excluir a role "${r.data.name}"? Isso só é permitido se nenhum usuário estiver usando ela.` });
          if (!ok) return;
          try {
            await deleteRole(r.id, async (roleName) => (await userRepository.findAll()).some((u) => u.role === roleName));
            reportSuccess('Role excluída.');
            renderUsers(c, currentUser);
          } catch (err) { reportError(err, 'roles'); }
        } }, 'Excluir') : ''),
      ]))),
    ])));
  }
}

function openRoleForm(container, currentUser) {
  const { node, getValues, validate } = renderForm([
    { key: 'name', label: 'Nome (identificador, ex: ACCOUNTANT)', required: true, full: true, hint: 'Será convertido para MAIÚSCULAS, sem espaços.' },
    { key: 'label', label: 'Rótulo de exibição', required: true },
    { key: 'description', label: 'Descrição', type: 'textarea', full: true },
  ], {});
  const body = h('div', {}, [node, h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
    const errors = validate();
    if (errors.length) return reportError(new Error(errors.join(' ')));
    const values = getValues();
    try {
      await createRole(values);
      closeModal();
      reportSuccess('Role criada. Configure os acessos dela na aba Permission Manager.');
      renderUsers(container, currentUser);
    } catch (err) { reportError(err, 'roles'); }
  } }, 'Criar role'))]);
  openModal({ title: 'Nova role', bodyNode: body });
}

async function openUserForm(container, currentUser) {
  const assignableRoles = (await listAssignableRoleNames()).filter((r) => r !== 'OWNER');
  const { node, getValues, validate } = renderForm([
    { key: 'displayName', label: 'Nome de exibição', required: true },
    { key: 'username', label: 'Usuário', required: true },
    { key: 'email', label: 'E-mail', required: true },
    { key: 'password', label: 'Senha', type: 'password', required: true },
    { key: 'role', label: 'Role', type: 'select', options: assignableRoles, required: true, hint: 'OWNER não pode ser concedido por aqui. Crie novas roles na seção "Roles" acima.' },
  ], {});
  const body = h('div', {}, [node, h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-primary', onClick: async () => {
    const errors = validate();
    if (errors.length) return reportError(new Error(errors.join(' ')));
    const values = getValues();
    try {
      await createUser(values);
      closeModal();
      reportSuccess('Usuário criado.');
      renderUsers(container, currentUser);
    } catch (err) { reportError(err, 'users'); }
  } }, 'Criar'))]);
  openModal({ title: 'Novo usuário', bodyNode: body });
}

// ---- Module Manager ----
async function renderModuleManager(c) {
  clear(c);
  const disabled = await getDisabledModules();
  c.appendChild(sectionTitle('🧱 Módulos instalados'));
  const unique = [];
  const seen = new Set();
  MODULES.forEach((m) => { if (!seen.has(m.key)) { seen.add(m.key); unique.push(m); } });
  c.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Módulo'), h('th', {}, 'Grupo'), h('th', {}, 'Status'), h('th', {}, '')])),
    h('tbody', {}, unique.filter((m) => !m.key.startsWith('admin-') && !m.key.startsWith('owner-')).map((m) => {
      const isDisabled = disabled.includes(m.key);
      return h('tr', {}, [
        h('td', {}, `${m.icon} ${m.label}`), h('td', {}, m.group),
        h('td', {}, isDisabled ? badge('Desativado', 'neutral') : badge('Ativo', 'success')),
        h('td', {}, h('button', { class: 'btn btn-sm', onClick: async () => { await setModuleEnabled(m.key, isDisabled); renderModuleManager(c); } }, isDisabled ? 'Ativar' : 'Desativar')),
      ]);
    })),
  ])));
}

// ---- Permission Manager ----
async function renderPermissionManager(c) {
  clear(c);
  await renderRolePermissionMatrix(c);

  c.appendChild(sectionTitle('👤 Matriz: usuário × módulo × permissão (exceções por pessoa)'));
  c.appendChild(h('p', {}, 'Sobrepõe o padrão da role de cada usuário para um módulo específico. Deixe em "(padrão do role)" para usar o valor definido acima.'));
  const users = (await userRepository.findAll()).filter((u) => u.role !== 'OWNER');
  const modulePerms = [...new Set(MODULES.map((m) => m.permission))];
  const overrides = await loadOverrides(true);
  const levels = Object.keys(MODULE_PERMISSION);

  const table = h('table', { class: 'data-table' });
  table.appendChild(h('thead', {}, h('tr', {}, [h('th', {}, 'Módulo'), ...users.map((u) => h('th', {}, u.displayName))])));
  const tbody = h('tbody', {});
  modulePerms.forEach((mp) => {
    const row = h('tr', {}, [h('td', {}, mp)]);
    users.forEach((u) => {
      const override = overrides.find((o) => o.userId === u.id && o.module === mp);
      const select = h('select', {}, [h('option', { value: '' }, '(padrão do role)'), ...levels.map((l) => h('option', { value: l, selected: override?.permission === l || undefined }, l))]);
      select.value = override ? override.permission : '';
      select.addEventListener('change', async () => {
        if (select.value === '') await removeOverride(u.id, mp);
        else await setOverride(u.id, mp, select.value);
        const { logAudit } = await import('../core/audit.js');
        await logAudit('PERMISSION_CHANGE', mp, `${u.displayName} -> ${select.value || 'default'}`);
        reportSuccess('Permissão atualizada.');
      });
      row.appendChild(h('td', {}, select));
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  c.appendChild(h('div', { class: 'table-wrap' }, table));
}

async function renderRolePermissionMatrix(c) {
  c.appendChild(sectionTitle('🔐 Matriz: role × módulo × permissão (padrão)'));
  c.appendChild(h('p', {}, 'Define o acesso padrão de cada role em cada módulo. OWNER sempre tem acesso total e não aparece aqui (não pode ser alterado). Roles customizadas criadas em User Management aparecem automaticamente.'));
  const roles = await listRoles();
  const roleNames = roles.map((r) => ({ name: r.data.name, label: r.data.label }));
  const permMap = await getRolePermissionsMap();
  const levels = Object.keys(MODULE_PERMISSION);

  const table = h('table', { class: 'data-table' });
  table.appendChild(h('thead', {}, h('tr', {}, [h('th', {}, 'Módulo'), ...roleNames.map((r) => h('th', {}, r.label))])));
  const tbody = h('tbody', {});
  ALL_MODULE_KEYS.forEach((moduleKey) => {
    const row = h('tr', {}, [h('td', {}, moduleKey)]);
    roleNames.forEach((r) => {
      const current = (permMap[r.name] && permMap[r.name][moduleKey]) || 'NONE';
      const select = h('select', {}, levels.map((l) => h('option', { value: l, selected: current === l || undefined }, l)));
      select.value = current;
      select.addEventListener('change', async () => {
        await setRolePermission(r.name, moduleKey, select.value);
        reportSuccess(`Permissão de "${r.label}" em "${moduleKey}" atualizada.`);
      });
      row.appendChild(h('td', {}, select));
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  c.appendChild(h('div', { class: 'table-wrap' }, table));
}

// ---- Privacy Manager ----
async function renderPrivacyManager(c) {
  clear(c);
  c.appendChild(sectionTitle('🕶️ Privacidade — registros por tipo e visibilidade'));
  c.appendChild(h('p', {}, 'PRIVATE (só o dono), FAMILY (qualquer usuário da família), CUSTOM (lista específica). Edite a visibilidade de um registro individual ao editá-lo em seu módulo.'));
  const rows = [];
  for (const entityType of KNOWN_ENTITY_TYPES) {
    const all = await new EntityRepository(entityType).findAll();
    if (!all.length) continue;
    const byVis = { PRIVATE: 0, FAMILY: 0, CUSTOM: 0 };
    all.forEach((r) => { byVis[r.visibility] = (byVis[r.visibility] || 0) + 1; });
    rows.push({ entityType, ...byVis, total: all.length });
  }
  c.appendChild(rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Tipo'), h('th', {}, 'Total'), h('th', {}, 'Private'), h('th', {}, 'Family'), h('th', {}, 'Custom')])),
    h('tbody', {}, rows.map((r) => h('tr', {}, [h('td', {}, r.entityType), h('td', {}, r.total), h('td', {}, r.PRIVATE), h('td', {}, r.FAMILY), h('td', {}, r.CUSTOM)]))),
  ])) : emptyState({ icon: '🕶️', title: 'Nenhum dado ainda' }));
}

// ---- Integration Center ----
async function renderIntegrations(c) {
  clear(c);
  c.appendChild(sectionTitle('🔌 Integration Center'));
  c.appendChild(h('div', { class: 'grid grid-2' }, await Promise.all(CONNECTORS.map(async (conn) => {
    const status = await conn.getStatus();
    return h('div', { class: 'card' }, [
      h('div', { class: 'flex-between' }, [h('strong', {}, conn.label), badge(status.status, status.status === 'CONNECTED' ? 'success' : status.status === 'ERROR' ? 'critical' : 'neutral')]),
      h('p', { class: 'muted' }, `Última importação: ${status.lastImportAt ? fmtDateTime(status.lastImportAt) : '—'}`),
      h('p', { class: 'muted' }, `Total importado: ${status.totalRecordsImported || 0} · Erros: ${status.lastError || 'nenhum'}`),
    ]);
  }))));
  c.appendChild(h('p', { class: 'muted', style: 'margin-top:10px' }, 'Para importar arquivos ou datasets demo, use Import Center. Dados corporativos (Jira/Calendário) só podem ser importados pelo OWNER em Owner → Corporate Collector.'));
}

// ---- Audit Log ----
async function renderAuditLog(c) {
  clear(c);
  const log = await getAuditLog();
  c.appendChild(sectionTitle('📜 Audit Log', h('span', { class: 'muted' }, `${log.length} evento(s)`)));
  c.appendChild(log.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Data'), h('th', {}, 'Ação'), h('th', {}, 'Módulo'), h('th', {}, 'Detalhes')])),
    h('tbody', {}, log.slice(0, 200).map((e) => h('tr', {}, [h('td', {}, fmtDateTime(e.timestamp)), h('td', {}, badge(e.action, 'neutral')), h('td', {}, e.module), h('td', {}, e.details || '—')]))),
  ])) : emptyState({ icon: '📜', title: 'Nenhum evento registrado ainda' }));
}

// ---- Data Management ----
async function renderDataManagement(c, currentUser) {
  clear(c);

  if (isOwner(currentUser)) {
    c.appendChild(sectionTitle('⚠️ Apagar tudo'));
    c.appendChild(h('div', { class: 'card', style: 'border-color:var(--critical)' }, [
      h('p', {}, 'Apaga os dados de TODOS os módulos de uma vez (equivalente a clicar "Limpar módulo" em cada linha da tabela abaixo, um por um). Não afeta usuários, permissões, configurações nem o Audit Log. É soft delete — recuperável restaurando um backup, mas os registros somem imediatamente de toda a aplicação.'),
      h('button', { class: 'btn btn-danger', onClick: async () => {
        const ok = await confirmDialog({
          title: 'Apagar dados de todos os módulos',
          message: 'Tem certeza? Isso apaga TODOS os registros de TODOS os módulos (Família, Igreja, Financeiro, Trabalho, Carreira, Vagas, Inglês, Estudos, CRM, Decisões, Projetos, Tarefas, etc.) — dados reais e demo juntos. Recomendado: exporte um backup antes (Admin → Backup & Restore) caso queira poder desfazer.',
          confirmLabel: 'Apagar tudo',
        });
        if (!ok) return;
        try {
          const count = await clearAllModulesData();
          reportSuccess(`${count} registro(s) apagado(s) em todos os módulos.`);
          renderDataManagement(c, currentUser);
        } catch (err) {
          reportError(err, 'data-management');
        }
      } }, '🗑️ Apagar dados de todos os módulos'),
    ]));
  }

  c.appendChild(sectionTitle('🗃️ Registros por módulo'));
  const rows = [];
  for (const entityType of KNOWN_ENTITY_TYPES) {
    const count = (await new EntityRepository(entityType).findAll()).length;
    if (count) rows.push({ entityType, count });
  }
  c.appendChild(rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Tipo'), h('th', {}, 'Registros'), h('th', {}, '')])),
    h('tbody', {}, rows.map((r) => h('tr', {}, [h('td', {}, r.entityType), h('td', {}, r.count), h('td', {}, h('button', { class: 'btn btn-sm btn-danger', onClick: async () => {
      const ok = await confirmDialog({ message: `Limpar (soft delete) TODOS os ${r.count} registros de "${r.entityType}"?` });
      if (!ok) return;
      const repo = new EntityRepository(r.entityType);
      const all = await repo.findAll();
      for (const rec of all) await repo.softDelete(rec.id);
      reportSuccess('Módulo limpo.');
      renderDataManagement(c, currentUser);
    } }, 'Limpar módulo'))]))),
  ])) : emptyState({ icon: '🗃️', title: 'Sem dados ainda' }));
}

// ---- System Health ----
async function renderSystemHealth(c) {
  clear(c);
  const estimate = await estimateStorage();
  const errors = getErrorLog();
  c.appendChild(h('div', { class: 'grid grid-4' }, [
    statTile('Schema version', SCHEMA_VERSION),
    statTile('IndexedDB', 'Conectado', storeNames().length + ' stores'),
    statTile('Armazenamento usado', estimate ? `${(estimate.usage / 1024 / 1024).toFixed(1)} MB` : 'N/D'),
    statTile('Erros recentes', errors.length),
  ]));
  c.appendChild(sectionTitle('🧯 Log de erros recentes'));
  c.appendChild(errors.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Quando'), h('th', {}, 'Contexto'), h('th', {}, 'Mensagem')])),
    h('tbody', {}, errors.slice(0, 30).map((e) => h('tr', {}, [h('td', {}, fmtDateTime(e.at)), h('td', {}, e.context), h('td', {}, e.message)]))),
  ])) : emptyState({ icon: '✅', title: 'Nenhum erro registrado nesta sessão' }));
}
