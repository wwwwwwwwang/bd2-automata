import { tasks, TASK_TYPES } from '@bd2-automata/shared';
import type { Env } from '../../env';

export type TaskType = typeof TASK_TYPES[number];
export type Task = typeof tasks.$inferSelect;

export abstract class BaseTaskHandler {
  async canExecute(task: Task, env: Env): Promise<boolean> {
    return true;
  }

  abstract handle(task: Task, env: Env): Promise<any>;
}
