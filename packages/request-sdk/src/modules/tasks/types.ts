export interface TaskRecord {
  id: number;
  taskType: string;
  accountId: number;
  cronExpression: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListQuery {
  page?: number;
  limit?: number;
}
