export interface TaskLogRecord {
  id: number;
  taskId?: number | null;
  gameAccountId?: number | null;
  status: string;
  message?: string | null;
  executedAt?: string;
}

export interface TaskLogListQuery {
  page?: number;
  limit?: number;
  taskId?: number;
}
