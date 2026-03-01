export interface GiftCodeRecord {
  id: number;
  code: string;
  description?: string | null;
  expiresAt?: string | null;
}
