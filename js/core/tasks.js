import { taskRepository } from './entities/taskRepository.js';
import { logAudit } from './audit.js';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELED'];

export async function createTask({ title, module, priority = 'MEDIUM', status = 'TODO', owner, dueDate = null, source = 'MANUAL', linkedEntity = null }) {
  const task = await taskRepository.create({ title, module, priority, status, owner, dueDate, source, linkedEntity });
  await logAudit('CREATE', 'tasks', `Task created: ${title}`, task.id);
  return task;
}

export async function updateTask(id, patch) {
  const task = await taskRepository.update(id, patch);
  await logAudit('UPDATE', 'tasks', `Task updated: ${task.title}`, id);
  return task;
}

export async function completeTask(id) {
  return updateTask(id, { status: 'DONE' });
}

export async function deleteTask(id) {
  await taskRepository.softDelete(id);
  await logAudit('DELETE', 'tasks', 'Task deleted', id);
}

export async function listAllTasks() {
  return taskRepository.findAll();
}

export async function listOpenTasks() {
  return taskRepository.findOpen();
}

export async function listOverdueTasks() {
  return taskRepository.findOverdue();
}

export async function listByOwner(owner) {
  return taskRepository.findByOwner(owner);
}

export async function listByModule(module) {
  return taskRepository.findByModule(module);
}
