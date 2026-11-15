import { randomUUID } from 'node:crypto';

export function createTaskStore() {
  const tasks = new Map();
  return {
    create(input) {
      const task = {
        id: randomUUID(),
        status: 'draft',
        topic: input.topic.trim(),
        createdAt: new Date().toISOString(),
      };
      tasks.set(task.id, task);
      return task;
    },
    get(id) { return tasks.get(id) ?? null; },
  };
}
