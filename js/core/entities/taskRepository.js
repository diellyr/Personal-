import { BaseRepository } from '../repository.js';
import { dataProvider } from '../indexedDbProvider.js';

class TaskRepository extends BaseRepository {
  constructor() {
    super('tasks');
  }

  async findByModule(module) {
    const all = await dataProvider.getAllByIndex('tasks', 'module', module);
    return all.filter((t) => !t.deleted_at);
  }

  async findByOwner(owner) {
    const all = await dataProvider.getAllByIndex('tasks', 'owner', owner);
    return all.filter((t) => !t.deleted_at);
  }

  async findOpen() {
    const all = await this.findAll();
    return all.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED');
  }

  async findOverdue(nowIsoDate = new Date().toISOString().slice(0, 10)) {
    const open = await this.findOpen();
    return open.filter((t) => t.dueDate && t.dueDate < nowIsoDate);
  }
}

export const taskRepository = new TaskRepository();
