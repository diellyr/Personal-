import { auditLogRepository } from './entities/auditLogRepository.js';
import { getCurrentUser } from './session.js';

export const AUDIT_ACTIONS = [
  'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT',
  'BACKUP', 'RESTORE', 'PERMISSION_CHANGE', 'INTEGRATION',
];

export async function logAudit(action, module, details = '', entityId = null) {
  const user = getCurrentUser();
  return auditLogRepository.append({
    userId: user ? user.id : null,
    action,
    module,
    entityId,
    details,
  });
}

export async function getAuditLog() {
  return auditLogRepository.findAll();
}
