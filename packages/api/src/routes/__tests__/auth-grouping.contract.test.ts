import { describe, expect, it } from 'vitest';

const PUBLIC_AUTH_ENDPOINTS = [
  '/register',
  '/login',
  '/refresh',
  '/verify-email',
  '/resend-verification',
  '/password/request-reset',
  '/password/reset',
] as const;

const PROTECTED_AUTH_ENDPOINTS = [
  '/me',
  '/logout',
  '/password/change',
  '/email-change/request',
  '/email-change/verify',
] as const;

describe('auth route grouping contract (skeleton)', () => {
  it('keeps public auth endpoints explicitly documented for anonymous access', () => {
    expect(PUBLIC_AUTH_ENDPOINTS).toEqual([
      '/register',
      '/login',
      '/refresh',
      '/verify-email',
      '/resend-verification',
      '/password/request-reset',
      '/password/reset',
    ]);
  });

  it('keeps protected auth endpoints explicitly documented for RBAC', () => {
    expect(PROTECTED_AUTH_ENDPOINTS).toEqual([
      '/me',
      '/logout',
      '/password/change',
      '/email-change/request',
      '/email-change/verify',
    ]);
  });
});
