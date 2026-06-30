import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  checkAuth,
  requireAuth,
  PROTECTED_ACTIONS,
  type ProtectedAction,
  type GuardNavigate,
} from './require-auth';
import { useMallStore } from '../store';

describe('half-guest guard', () => {
  afterEach(() => {
    useMallStore.getState().reset();
  });

  it('PROTECTED_ACTIONS covers add-to-cart / checkout / view-profile / orders / collect / etc', () => {
    const expected: ProtectedAction[] = [
      'add-to-cart',
      'checkout',
      'view-profile',
      'view-orders',
      'view-coupons',
      'cancel-order',
      'collect',
      'view-footprint',
      'submit-aftersale',
      'post-comment',
    ];
    for (const a of expected) expect(PROTECTED_ACTIONS).toContain(a);
  });

  it('checkAuth allows any action when logged in', () => {
    for (const action of PROTECTED_ACTIONS) {
      expect(checkAuth(action, true)).toEqual({ allowed: true });
    }
  });

  it('checkAuth blocks protected actions when logged out and captures returnTo', () => {
    const result = checkAuth('add-to-cart', false);
    expect(result.allowed).toBe(false);
    expect(result.pendingReturnTo).toBeDefined();
  });

  it('requireAuth redirects to login with returnTo when logged out', () => {
    const navigate = vi.fn() as unknown as GuardNavigate;
    const navSpy = navigate as unknown as { mock: { calls: unknown[] } };

    window.location.hash = '/tab/cart';
    const result = requireAuth('checkout', navigate, false);

    expect(result.allowed).toBe(false);
    expect(navSpy.mock.calls.length).toBe(1);
    const [authPage, returnTo] = navSpy.mock.calls[0]! as ['login', string | undefined];
    expect(authPage).toBe('login');
    expect(returnTo).toContain('/tab/cart');
  });

  it('requireAuth does not redirect when logged in', () => {
    useMallStore.getState().setAuth({
      accessToken: 'tok',
      userInfo: { userId: 'u', userName: 'u' },
    });
    const navigate = vi.fn();
    const result = requireAuth('checkout', navigate as never as GuardNavigate);
    expect(result.allowed).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('requireAuth preserves the current page as returnTo for stacked pages', () => {
    const navigate = vi.fn() as unknown as GuardNavigate;
    const navSpy = navigate as unknown as { mock: { calls: unknown[] } };

    window.location.hash = '/page/product?id=42';
    requireAuth('collect', navigate, false);

    const [, returnTo] = navSpy.mock.calls[0]! as ['login', string];
    expect(returnTo).toContain('/page/product');
    expect(returnTo).toContain('id=42');
  });
});
