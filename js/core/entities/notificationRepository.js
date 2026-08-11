import { BaseRepository } from '../repository.js';
import { dataProvider } from '../indexedDbProvider.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  async findForUser(userId) {
    const mine = await dataProvider.getAllByIndex('notifications', 'userId', userId);
    const broadcast = await dataProvider.getAllByIndex('notifications', 'userId', 'ALL');
    return [...mine, ...broadcast]
      .filter((n) => !n.deleted_at)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}

export const notificationRepository = new NotificationRepository();
