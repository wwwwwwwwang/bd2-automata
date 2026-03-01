import type { RequestClient } from '../../core';
import type { GiftCodeRecord } from './types';

export const createGiftCodeRequests = (client: RequestClient) => ({
  list: () => client.get<GiftCodeRecord[]>('/api/gift-codes'),
  detail: (id: number) => client.get<GiftCodeRecord>(`/api/gift-codes/${id}`),
});
