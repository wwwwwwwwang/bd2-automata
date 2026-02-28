import { describe, expect, it, vi } from 'vitest';
import {
  AUTHZ_CACHE_VERSION_KEY,
  AUTHZ_PERMISSION_CACHE_PREFIX,
  buildPermissionCacheKey,
  bumpAuthzCacheVersion,
  getAuthzCacheVersion,
} from '../authz-cache';

class MockKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

describe('authz-cache utils', () => {
  it('returns default version when kv has no version', async () => {
    const kv = new MockKV() as unknown as KVNamespace;
    await expect(getAuthzCacheVersion(kv)).resolves.toBe('0');
  });

  it('builds versioned permission cache key', () => {
    const key = buildPermissionCacheKey(42, '1700000000000');
    expect(key).toBe(`${AUTHZ_PERMISSION_CACHE_PREFIX}:v1700000000000:u42`);
  });

  it('bumps cache version and persists key', async () => {
    const kv = new MockKV() as unknown as KVNamespace;
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await expect(bumpAuthzCacheVersion(kv)).resolves.toBe('1700000000000');
    await expect((kv as unknown as MockKV).get(AUTHZ_CACHE_VERSION_KEY)).resolves.toBe('1700000000000');

    nowSpy.mockRestore();
  });
});
