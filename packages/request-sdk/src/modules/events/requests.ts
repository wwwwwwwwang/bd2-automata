import type { RequestClient } from '../../core';
import type { EventRecord } from './types';

export const createEventRequests = (client: RequestClient) => ({
  list: () => client.get<EventRecord[]>('/api/events'),
  detail: (id: number) => client.get<EventRecord>(`/api/events/${id}`),
});
