import { BaseRepository } from '../repository.js';
import { dataProvider } from '../indexedDbProvider.js';

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByUsername(username) {
    const all = await dataProvider.getAllByIndex('users', 'username', username.toLowerCase());
    return all[0] || null;
  }

  async findAll({ includeDeleted = false } = {}) {
    const all = await dataProvider.getAll('users');
    return includeDeleted ? all : all.filter((r) => !r.deleted_at);
  }
}

export const userRepository = new UserRepository();
