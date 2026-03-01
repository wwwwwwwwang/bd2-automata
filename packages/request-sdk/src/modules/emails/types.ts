export interface EmailQueueRecord {
  id: number;
  recipientEmail: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface EmailQueueListQuery {
  page?: number;
  limit?: number;
}
