import type { RequestClient } from '../../core';
import type { EmailQueueListQuery, EmailQueueRecord } from './types';

export const createEmailRequests = (client: RequestClient) => ({
  queue: (query: EmailQueueListQuery = {}) => client.get<EmailQueueRecord[]>('/api/email-queue', { query }),
  process: () => client.post<{ processed: number; failed: number }>('/process-emails'),
});
