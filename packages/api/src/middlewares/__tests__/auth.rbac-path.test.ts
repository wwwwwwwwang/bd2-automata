import { describe, expect, it } from 'vitest';
import { normalizePath, resolvePermissionPath } from '../auth';

describe('rbac path normalization', () => {
  it('normalizes redundant slashes and trailing slash', () => {
    expect(normalizePath('///api//users///')).toBe('/api/users');
  });

  it('keeps root path stable', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });

  it('prefers routePath for dynamic route matching', () => {
    const resolved = resolvePermissionPath('https://example.com/api/users/123', '/api/users/:id');
    expect(resolved).toBe('/api/users/:id');
  });

  it('falls back to url pathname when routePath is missing', () => {
    const resolved = resolvePermissionPath('https://example.com/api/auth/me/');
    expect(resolved).toBe('/api/auth/me');
  });
});
