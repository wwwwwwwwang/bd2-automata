import type { RequestClient } from '../../core';
import type { TaskLogListQuery, TaskLogRecord } from './types';

export const createTaskLogRequests = (client: RequestClient) => ({
  list: (query: TaskLogListQuery = {}) => client.get<TaskLogRecord[]>('/api/task-logs', { query }),
  remove: (id: number) => client.delete<{ message: string }>(`/api/task-logs/${id}`),
});
