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
import { parseJSON } from '../core/importUtils.js';
import { extractSchoolBackupRows, schoolBackupConnector } from '../core/connectors/schoolBackupConnector.js';
import { computeSchoolEvolution } from '../core/schoolIntelligence.js';

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

  await test('Import: parseJSON finds the record list under an unanticipated wrapper key', async () => {
    // Regression test for a real bug: a Pluma export shaped like
    // { exportedAt, totalTransactions, transactions: [...] } was treated as
    // ONE malformed record because only records/items/data were recognized.
    const wrapped = JSON.stringify({ exportedAt: 'x', totalTransactions: 2, transactions: [{ a: 1 }, { a: 2 }] });
    const rows = parseJSON(wrapped);
    if (!Array.isArray(rows) || rows.length !== 2) throw new Error(`expected 2 rows, got ${JSON.stringify(rows)}`);

    const bareArray = JSON.stringify([{ a: 1 }]);
    if (parseJSON(bareArray).length !== 1) throw new Error('bare array should still parse directly');

    const knownKey = JSON.stringify({ records: [{ a: 1 }, { a: 2 }, { a: 3 }] });
    if (parseJSON(knownKey).length !== 3) throw new Error('known wrapper key "records" should still work');

    const noArrayAtAll = JSON.stringify({ id: 1, name: 'solo record' });
    const solo = parseJSON(noArrayAtAll);
    if (solo.length !== 1 || solo[0].id !== 1) throw new Error('object with no array property should become a single-item list');
  });

  await test('School Backup: joins relational tables into flat rows, skips isDemo students, computes scoreValue', async () => {
    const tables = {
      students: [
        { id: 'real-1', fullName: 'Aluno Real', isDemo: false },
        { id: 'seed-1', fullName: 'Aluno Demo da Escola', isDemo: true },
      ],
      assessmentCategories: [{ id: 'cat-1', name: 'Autonomia' }],
      activities: [{ id: 'act-1', categoryId: 'cat-1', period: '2026-b1', date: '2026-03-01' }],
      assessments: [
        { id: 'as-1', studentId: 'real-1', activityId: 'act-1', rboLevel: 'O', publishedAt: '2026-03-02' },
        { id: 'as-2', studentId: 'seed-1', activityId: 'act-1', rboLevel: 'R', publishedAt: '2026-03-02' },
      ],
      assessmentScales: [{ id: 'scale-1', levels: [{ code: 'E', order: 1 }, { code: 'A', order: 5 }] }],
      grades: [
        { id: 'gr-1', studentId: 'real-1', subject: 'Matemática', period: '2026-B1', scaleId: 'scale-1', scaleLevelCode: 'A' },
      ],
    };
    const rows = extractSchoolBackupRows(tables);
    if (rows.length !== 2) throw new Error(`expected 2 rows (isDemo student skipped), got ${rows.length}`);
    if (rows.some((r) => r.childName === 'Aluno Demo da Escola')) throw new Error('isDemo student should have been filtered out');

    const mappedCategory = schoolBackupConnector.mapRecord(rows.find((r) => r.kind === 'CATEGORY'));
    if (mappedCategory.period !== 'B1' || mappedCategory.year !== 2026 || mappedCategory.semester !== 1) throw new Error(`bad period normalization: ${JSON.stringify(mappedCategory)}`);
    if (mappedCategory.scoreValue !== 10) throw new Error(`expected RBO 'O' to map to scoreValue 10, got ${mappedCategory.scoreValue}`);

    const mappedSubject = schoolBackupConnector.mapRecord(rows.find((r) => r.kind === 'SUBJECT'));
    if (mappedSubject.scoreValue !== 10) throw new Error(`expected concept level 'A' (order 5/5) to map to scoreValue 10, got ${mappedSubject.scoreValue}`);

    // A backup file parses (via detectFormatAndParse) into a 1-element array
    // wrapping the whole { tables } object — expand() must recognize that
    // shape and join it, not treat it as a single malformed record.
    const expanded = schoolBackupConnector.expand([{ tables }]);
    if (expanded.length !== 2) throw new Error('expand() did not recognize the wrapped-backup shape');
  });

  await test('School Intelligence: bimester/semester comparison averages current vs previous correctly', async () => {
    const repo = new EntityRepository('family.schoolGrade');
    const child = `TestChild${Date.now()}`;
    const rec = (period, year, semester, scoreValue) => repo.create({ childName: child, kind: 'CATEGORY', category: 'Foco', period, year, semester, scoreValue }, { visibility: 'FAMILY' });
    const created = await Promise.all([
      rec('B1', 2026, 1, 4), rec('B2', 2026, 1, 6), rec('B3', 2026, 2, 8), rec('B4', 2026, 2, 10),
    ]);
    try {
      const user = getCurrentUser();
      const ev = await computeSchoolEvolution(user, child);
      if (ev.bimesterComparison.currentLabel !== '4º bim/2026') throw new Error(`expected current bimester to be the latest, got ${ev.bimesterComparison.currentLabel}`);
      if (ev.bimesterComparison.categories[0].current !== 10 || ev.bimesterComparison.categories[0].previous !== 8) throw new Error(`bad bimester comparison: ${JSON.stringify(ev.bimesterComparison.categories[0])}`);
      if (ev.semesterComparison.categories[0].current !== 9 || ev.semesterComparison.categories[0].previous !== 5) throw new Error(`bad semester average (expected (8+10)/2=9 vs (4+6)/2=5): ${JSON.stringify(ev.semesterComparison.categories[0])}`);
    } finally {
      await Promise.all(created.map((r) => repo.hardDelete(r.id)));
    }
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
