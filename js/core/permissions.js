import { dataProvider } from './indexedDbProvider.js';

// ---- RBAC -------------------------------------------------------------
// Roles ordered by seniority. OWNER is reserved for exactly one account
// (Dielly) and can never be granted by an admin — see docs/PERMISSIONS.md.
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

// Default module -> minimum-role permission matrix. This is the seed used
// the first time the app runs; Owner > Permission Manager can layer
// per-user overrides on top (stored in `permissions_overrides`).
// Corporate/work data defaults to lower visibility for FAMILY_ADMIN by
// design (see rule 102 in the product spec): work/career/jobs modules are
// VIEW-capped for FAMILY_ADMIN regardless of records' own visibility flag.
const DEFAULT_ROLE_MODULE_PERMISSIONS = {
  OWNER: 'ADMIN', // OWNER role gets OWNER-level via isOwner() checks separately; ADMIN covers all module CRUD
  FAMILY_ADMIN: {
    default: 'EDIT',
    work: 'VIEW',
    career: 'VIEW',
    jobs: 'NONE',
    finance: 'VIEW',
    owner: 'NONE',
    admin: 'NONE',
  },
  MEMBER: {
    default: 'VIEW',
  },
};

function roleDefaultForModule(role, moduleKey) {
  if (role === ROLES.OWNER) return MODULE_PERMISSION.ADMIN;
  const cfg = DEFAULT_ROLE_MODULE_PERMISSIONS[role] || {};
  const level = cfg[moduleKey] || cfg.default || 'NONE';
  return MODULE_PERMISSION[level];
}

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
