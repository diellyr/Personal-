import { h, clear } from '../ui/dom.js';
import { sectionTitle, badge, emptyState } from '../ui/components/misc.js';
import { EntityRepository } from '../core/entityRepository.js';
import { canViewResource, getModulePermission, setOverride, removeOverride } from '../core/permissions.js';
import { buildBackup, validateBackup, restoreBackup } from '../core/backupService.js';
import { generateCrossModuleInsights } from '../core/ai/crossModuleInsights.js';
import { acompanhaPlusConnector } from '../core/connectors/acompanhaPlusConnector.js';
import { userRepository } from '../core/entities/userRepository.js';
import { getCurrentUser, setCurrentUser } from '../core/session.js';
import { createRole, deleteRole, setRolePermission, listRoles } from '../core/roleService.js';

export async function render(container, ctx) {
  clear(container);
  container.appendChild(h('h1', {}, '🧪 Test Runner'));
  container.appendChild(h('p', {}, 'Testes locais para serviços críticos: repositórios, permissões, visibilidade, backup/restore, import e regras cross-module.'));
  const btn = h('button', { class: 'btn btn-primary', onClick: () => run(resultsHost) }, 'Executar todos os testes');
  const resultsHost = h('div', { style: 'margin-top:16px' });
  container.appendChild(btn);
  container.appendChild(resultsHost);
}

async function run(host) {
  clear(host);
  host.appendChild(h('div', { class: 'loading-spinner' }, 'Executando…'));
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, message: err.message }); }
  };

  await test('Repository: create/read/update/soft-delete round-trip', async () => {
    const repo = new EntityRepository('test.sample');
    const rec = await repo.create({ value: 'A' });
    const fetched = await repo.getById(rec.id);
    if (!fetched || fetched.data.value !== 'A') throw new Error('create/getById failed');
    await repo.update(rec.id, { value: 'B' });
    const updated = await repo.getById(rec.id);
    if (updated.data.value !== 'B') throw new Error('update failed');
    await repo.softDelete(rec.id);
    const afterDelete = await repo.getById(rec.id);
    if (afterDelete !== null) throw new Error('soft delete should hide record from getById');
    await repo.hardDelete(rec.id);
  });

  await test('Visibility: PRIVATE hides record from other users', async () => {
    // Synthetic non-OWNER users so the assertion doesn't depend on which
    // seeded account happens to be OWNER (OWNER can see everything by
    // design, which would make this a false failure).
    const u1 = { id: 'test-user-1', role: 'FAMILY_ADMIN' };
    const u2 = { id: 'test-user-2', role: 'MEMBER' };
    const record = { owner_id: u1.id, visibility: 'PRIVATE', created_by: u1.id, deleted_at: null };
    if (!canViewResource(u1, record)) throw new Error('owner should see own private record');
    if (canViewResource(u2, record)) throw new Error('other user should NOT see private record');
  });

  await test('Visibility: FAMILY is visible to all', async () => {
    const u1 = { id: 'test-user-1', role: 'FAMILY_ADMIN' };
    const u2 = { id: 'test-user-2', role: 'MEMBER' };
    const record = { owner_id: u1.id, visibility: 'FAMILY', deleted_at: null };
    if (!canViewResource(u2, record)) throw new Error('FAMILY record should be visible to all');
  });

  await test('Permissions: module permission override applies', async () => {
    const users = (await userRepository.findAll()).filter((u) => u.role !== 'OWNER');
    if (!users.length) throw new Error('need a non-owner user');
    const u = users[0];
    await setOverride(u.id, 'test_module', 'ADMIN');
    const level = await getModulePermission(u, 'test_module');
    if (level < 5) throw new Error('override to ADMIN did not apply');
    await removeOverride(u.id, 'test_module');
  });

  await test('Backup: export shape is valid', async () => {
    const backup = await buildBackup();
    const { valid, errors } = validateBackup(backup);
    if (!valid) throw new Error(`invalid backup: ${errors.join(' ')}`);
  });

  await test('Backup: restore MERGE round-trip preserves a record', async () => {
    const repo = new EntityRepository('test.sample');
    const rec = await repo.create({ value: 'restore-test' });
    const backup = await buildBackup();
    await repo.softDelete(rec.id);
    await restoreBackup(backup, 'MERGE');
    const restored = await repo.getById(rec.id);
    if (!restored) throw new Error('record not restored');
    await repo.hardDelete(rec.id);
  });

  await test('Connector: demo dataset imports without duplicating on 2nd run', async () => {
    const before = (await acompanhaPlusConnector.repo.findAll()).length;
    await acompanhaPlusConnector.importDemoDataset();
    const afterFirst = (await acompanhaPlusConnector.repo.findAll()).length;
    await acompanhaPlusConnector.importDemoDataset();
    const afterSecond = (await acompanhaPlusConnector.repo.findAll()).length;
    if (afterSecond !== afterFirst) throw new Error(`expected dedupe, got ${afterFirst} -> ${afterSecond}`);
    if (afterFirst <= before && before === 0) throw new Error('expected records to be imported');
  });

  await test('Cross-Module Insights: runs without throwing and returns an array', async () => {
    const insights = await generateCrossModuleInsights();
    if (!Array.isArray(insights)) throw new Error('expected array result');
  });

  await test('Roles: custom role can be created, granted a permission, and applies to a user', async () => {
    const uniqueName = `TESTROLE${Date.now()}`;
    const role = await createRole({ name: uniqueName, label: 'Test Role' });
    const roles = await listRoles();
    if (!roles.some((r) => r.data.name === uniqueName)) throw new Error('role not found after creation');

    await setRolePermission(uniqueName, 'test_module', 'EDIT');
    const fakeUser = { id: 'test-role-user', role: uniqueName };
    const level = await getModulePermission(fakeUser, 'test_module');
    if (level < 3) throw new Error(`expected EDIT(3)+ for granted module, got ${level}`);
    const ungrantedLevel = await getModulePermission(fakeUser, 'some_other_module');
    if (ungrantedLevel !== 0) throw new Error(`expected NONE(0) for ungranted module by default, got ${ungrantedLevel}`);

    await deleteRole(role.id);
    const rolesAfter = await listRoles();
    if (rolesAfter.some((r) => r.data.name === uniqueName)) throw new Error('role still present after delete');
  });

  await test('Roles: built-in role cannot be deleted', async () => {
    const roles = await listRoles();
    const familyAdmin = roles.find((r) => r.data.name === 'FAMILY_ADMIN');
    if (!familyAdmin) throw new Error('FAMILY_ADMIN role missing — ensureBuiltInRoles() did not run');
    let threw = false;
    try { await deleteRole(familyAdmin.id); } catch { threw = true; }
    if (!threw) throw new Error('deleting a built-in role should have thrown');
  });

  clear(host);
  const passed = results.filter((r) => r.pass).length;
  host.appendChild(sectionTitle(`Resultados: ${passed}/${results.length} passaram`));
  host.appendChild(h('div', {}, results.map((r) => h('div', { class: `insight-card ${r.pass ? 'INFO' : 'CRITICAL'}` }, [
    h('div', { class: 'flex-between' }, [h('div', { class: 'insight-title' }, r.name), badge(r.pass ? 'PASS' : 'FAIL', r.pass ? 'success' : 'critical')]),
    r.message ? h('div', { class: 'muted' }, r.message) : null,
  ]))));
}
