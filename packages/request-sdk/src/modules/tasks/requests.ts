import type { RequestClient } from '../../core';
import type { TaskRecord, TaskListQuery } from './types';

export const createTaskRequests = (client: RequestClient) => ({
  list: (query: TaskListQuery = {}) => client.get<TaskRecord[]>('/api/tasks', { query }),
  detail: (id: number) => client.get<TaskRecord>(`/api/tasks/${id}`),
  create: (payload: Partial<TaskRecord>) => client.post<TaskRecord>('/api/tasks', payload),
  update: (id: number, payload: Partial<TaskRecord>) => client.put<TaskRecord>(`/api/tasks/${id}`, payload),
  remove: (id: number) => client.delete<{ message: string }>(`/api/tasks/${id}`),
});
