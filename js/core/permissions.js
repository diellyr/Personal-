import { dataProvider } from './indexedDbProvider.js';

// ---- RBAC -------------------------------------------------------------
// Built-in roles. OWNER is reserved for exactly one account (Dielly) and
// can never be granted by an admin — see docs/PERMISSIONS.md. FAMILY_ADMIN
// and MEMBER are the two built-in non-owner roles; additional custom roles
// can be created at runtime (Admin -> User Management) — see
// js/core/roleService.js. Every non-OWNER role's per-module default
// permission is data-driven (stored in the `admin.rolePermission` entity
// type), not hardcoded, so custom roles work exactly like built-in ones.
export const ROLES = {
  OWNER: 'OWNER',
  FAMILY_ADMIN: 'FAMILY_ADMIN',
  MEMBER: 'MEMBER',
};

export const MODULE_PERMISSION = {
  NONE: 0,
  VIEW: 1,
  CREATE: 2,
  EDIT: 3,
  DELETE: 4,
  ADMIN: 5,
  OWNER: 6,
};

export const VISIBILITY = {
  PRIVATE: 'PRIVATE',
  FAMILY: 'FAMILY',
  CUSTOM: 'CUSTOM',
};

export function isOwner(user) {
  return !!user && user.role === ROLES.OWNER;
}

let overridesCache = null;
export async function loadOverrides(force = false) {
  if (overridesCache && !force) return overridesCache;
  overridesCache = await dataProvider.getAll('permissions_overrides');
  return overridesCache;
}

export function invalidateOverrideCache() {
  overridesCache = null;
}

// Role-level default permissions (one row per role+module, in the
// `records` store under entityType 'admin.rolePermission'). Read directly
// via dataProvider here (not through roleService.js, which writes this
// data) to avoid a circular import — roleService.js imports
// invalidateRolePermissionCache from this file.
let rolePermCache = null;
async function loadRolePermissions(force = false) {
  if (rolePermCache && !force) return rolePermCache;
  const all = await dataProvider.getAllByIndex('records', 'entityType', 'admin.rolePermission');
  rolePermCache = all.filter((r) => !r.deleted_at);
  return rolePermCache;
}

export function invalidateRolePermissionCache() {
  rolePermCache = null;
}

async function roleDefaultForModule(role, moduleKey) {
  const rows = await loadRolePermissions();
  const entry = rows.find((r) => r.data.role === role && r.data.module === moduleKey);
  // No row = no access. Safe for brand-new custom roles (principle of
  // least privilege) and for any module added after a role was created.
  return entry ? (MODULE_PERMISSION[entry.data.permission] ?? MODULE_PERMISSION.NONE) : MODULE_PERMISSION.NONE;
}

export async function getModulePermission(user, moduleKey) {
  if (!user) return MODULE_PERMISSION.NONE;
  if (isOwner(user)) return MODULE_PERMISSION.OWNER;
  const overrides = await loadOverrides();
  const override = overrides.find((o) => o.userId === user.id && o.module === moduleKey);
  if (override) return MODULE_PERMISSION[override.permission] ?? MODULE_PERMISSION.NONE;
  return roleDefaultForModule(user.role, moduleKey);
}

export async function can(user, moduleKey, minPermission) {
  const level = await getModulePermission(user, moduleKey);
  return level >= MODULE_PERMISSION[minPermission];
}

// ---- Resource visibility (separate axis from module permission) -------
export function canViewResource(user, record) {
  if (!record) return false;
  if (isOwner(user)) return true;
  if (record.deleted_at) return false;
  if (!record.visibility || record.visibility === VISIBILITY.PRIVATE) {
    return record.owner_id === user.id || record.created_by === user.id;
  }
  if (record.visibility === VISIBILITY.FAMILY) {
    return true; // any authenticated household member
  }
  if (record.visibility === VISIBILITY.CUSTOM) {
    return (record.custom_visibility || []).includes(user.id) || record.owner_id === user.id;
  }
  return false;
}

export function filterVisible(user, records) {
  return records.filter((r) => canViewResource(user, r));
}

export async function setOverride(userId, moduleKey, permission) {
  const { uuid } = await import('./uuid.js');
  const overrides = await loadOverrides(true);
  const existing = overrides.find((o) => o.userId === userId && o.module === moduleKey);
  const record = existing
    ? { ...existing, permission }
    : { id: uuid(), userId, module: moduleKey, permission };
  await dataProvider.put('permissions_overrides', record);
  invalidateOverrideCache();
  return record;
}

export async function removeOverride(userId, moduleKey) {
  const overrides = await loadOverrides(true);
  const existing = overrides.find((o) => o.userId === userId && o.module === moduleKey);
  if (existing) {
    await dataProvider.delete('permissions_overrides', existing.id);
    invalidateOverrideCache();
  }
}
