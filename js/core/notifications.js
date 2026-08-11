import { notificationRepository } from './entities/notificationRepository.js';
import { uuid, nowIso } from './uuid.js';
import { dataProvider } from './indexedDbProvider.js';

export const SEVERITY = { INFO: 'INFO', OPPORTUNITY: 'OPPORTUNITY', WARNING: 'WARNING', CRITICAL: 'CRITICAL' };

export async function notify({ userId = 'ALL', module, severity = SEVERITY.INFO, title, message, linkedEntity = null }) {
  const record = {
    id: uuid(),
    userId,
    module,
    severity,
    title,
    message,
    linkedEntity,
    status: 'UNREAD',
    createdAt: nowIso(),
    resolvedAt: null,
  };
  await dataProvider.put('notifications', record);
  return record;
}

export async function listForUser(userId) {
  return notificationRepository.findForUser(userId);
}

export async function markRead(id) {
  const n = await dataProvider.get('notifications', id);
  if (!n) return null;
  n.status = n.status === 'RESOLVED' ? 'RESOLVED' : 'READ';
  await dataProvider.put('notifications', n);
  return n;
}

export async function markUnread(id) {
  const n = await dataProvider.get('notifications', id);
  if (!n) return null;
  n.status = 'UNREAD';
  await dataProvider.put('notifications', n);
  return n;
}

export async function markResolved(id) {
  const n = await dataProvider.get('notifications', id);
  if (!n) return null;
  n.status = 'RESOLVED';
  n.resolvedAt = nowIso();
  await dataProvider.put('notifications', n);
  return n;
}

export async function unreadCount(userId) {
  const list = await listForUser(userId);
  return list.filter((n) => n.status === 'UNREAD').length;
}

// Idempotent notifier used by rule engines (Chief of Staff, Cross-Module
// Insights, connectors) so re-running analysis doesn't spam duplicates.
export async function notifyOnce({ userId = 'ALL', module, severity, title, message, linkedEntity = null, dedupeKey }) {
  const list = await listForUser(userId === 'ALL' ? 'ALL' : userId);
  const exists = list.find((n) => n.linkedEntity === (dedupeKey || linkedEntity) && n.title === title && n.status !== 'RESOLVED');
  if (exists) return exists;
  return notify({ userId, module, severity, title, message, linkedEntity: dedupeKey || linkedEntity });
}
