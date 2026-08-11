import { EntityRepository } from './entityRepository.js';
import { MODULES } from './moduleRegistry.js';
import { logAudit } from './audit.js';
import { invalidateRolePermissionCache } from './permissions.js';

const roleRepo = new EntityRepository('admin.role');
const rolePermRepo = new EntityRepository('admin.rolePermission');

export const ALL_MODULE_KEYS = [...new Set(MODULES.map((m) => m.permission))];

// Seed values for the two built-in non-OWNER roles, matching what used to
// be a hardcoded JS object before roles became data-driven. Used once, by
// ensureBuiltInRoles(), to populate js/core/entityRepository.js-backed
// storage so behavior doesn't change for existing installs. OWNER is never
// a row here — it stays a hardcoded special case (see permissions.js).
const BUILT_IN_SEED = {
  FAMILY_ADMIN: {
    label: 'Family Admin',
    defaults: {
      default: 'EDIT', work: 'VIEW', career: 'VIEW', jobs: 'NONE', finance: 'VIEW', owner: 'NONE', admin: 'NONE',
    },
  },
  MEMBER: {
    label: 'Member',
    defaults: { default: 'VIEW' },
  },
};

function resolveSeedLevel(defaults, moduleKey) {
  return defaults[moduleKey] || defaults.default || 'NONE';
}

/** Idempotent — safe to call on every boot, not gated behind demo-data seeding. */
export async function ensureBuiltInRoles() {
  const existingRoles = await roleRepo.findAll();
  for (const [name, seed] of Object.entries(BUILT_IN_SEED)) {
    let roleRecord = existingRoles.find((r) => r.data.name === name);
    if (!roleRecord) {
      roleRecord = await roleRepo.create({ name, label: seed.label, description: '', builtIn: true }, { visibility: 'FAMILY' });
    }
    const existingPerms = await rolePermRepo.findAll();
    for (const moduleKey of ALL_MODULE_KEYS) {
      const already = existingPerms.find((p) => p.data.role === name && p.data.module === moduleKey);
      if (!already) {
        await rolePermRepo.create({ role: name, module: moduleKey, permission: resolveSeedLevel(seed.defaults, moduleKey) }, { visibility: 'FAMILY' });
      }
    }
  }
  invalidateRolePermissionCache();
}

export async function listRoles() {
  return roleRepo.findAll();
}

export async function listAssignableRoleNames() {
  const roles = await listRoles();
  return ['OWNER', ...roles.map((r) => r.data.name)];
}

export async function createRole({ name, label, description = '' }) {
  const clean = (name || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!clean) throw new Error('Nome da role é obrigatório.');
  if (clean === 'OWNER') throw new Error('"OWNER" é reservado e não pode ser usado.');
  const existing = await listRoles();
  if (existing.some((r) => r.data.name === clean)) throw new Error(`Já existe uma role "${clean}".`);
  const role = await roleRepo.create({ name: clean, label: label || clean, description, builtIn: false }, { visibility: 'FAMILY' });
  await logAudit('CREATE', 'roles', `Role criada: ${clean}`, role.id);
  return role;
}

export async function deleteRole(roleId, isRoleInUseFn) {
  const role = await roleRepo.getById(roleId);
  if (!role) throw new Error('Role não encontrada.');
  if (role.data.builtIn) throw new Error('Roles padrão do sistema não podem ser excluídas.');
  if (isRoleInUseFn && (await isRoleInUseFn(role.data.name))) {
    throw new Error(`A role "${role.data.name}" está em uso por um ou mais usuários. Reatribua-os antes de excluir.`);
  }
  await roleRepo.softDelete(roleId);
  const perms = await rolePermRepo.findAll();
  for (const p of perms) {
    if (p.data.role === role.data.name) await rolePermRepo.softDelete(p.id);
  }
  await logAudit('DELETE', 'roles', `Role excluída: ${role.data.name}`, roleId);
  invalidateRolePermissionCache();
}

export async function getRolePermissionsMap() {
  const rows = await rolePermRepo.findAll();
  const map = {};
  rows.forEach((r) => {
    map[r.data.role] = map[r.data.role] || {};
    map[r.data.role][r.data.module] = r.data.permission;
  });
  return map;
}

export async function setRolePermission(role, moduleKey, permission) {
  const rows = await rolePermRepo.findAll();
  const existing = rows.find((r) => r.data.role === role && r.data.module === moduleKey);
  if (existing) await rolePermRepo.update(existing.id, { permission });
  else await rolePermRepo.create({ role, module: moduleKey, permission }, { visibility: 'FAMILY' });
  await logAudit('PERMISSION_CHANGE', moduleKey, `Role "${role}" -> ${permission}`);
  invalidateRolePermissionCache();
}
