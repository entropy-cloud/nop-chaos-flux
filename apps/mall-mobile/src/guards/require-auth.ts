import type { AuthPageKey } from '../route-model';
import { useMallStore } from '../store';

export type ProtectedAction =
  | 'add-to-cart'
  | 'checkout'
  | 'view-profile'
  | 'view-orders'
  | 'view-coupons'
  | 'cancel-order'
  | 'collect'
  | 'view-footprint'
  | 'submit-aftersale'
  | 'post-comment';

export const PROTECTED_ACTIONS: readonly ProtectedAction[] = [
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

export interface GuardResult {
  allowed: boolean;
  pendingReturnTo?: string;
}

export function checkAuth(action: ProtectedAction, isLoggedIn: boolean): GuardResult {
  if (!PROTECTED_ACTIONS.includes(action)) return { allowed: true };
  if (isLoggedIn) return { allowed: true };
  return { allowed: false, pendingReturnTo: currentReturnToForAction(action) };
}

function currentReturnToForAction(_action: ProtectedAction): string {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (!hash || hash === '#/' || hash === '#') return '/';
  return hash.startsWith('#') ? hash.slice(1) : hash;
}

export interface GuardNavigate {
  (auth: AuthPageKey, returnTo?: string): void;
}

export function requireAuth(
  action: ProtectedAction,
  navigate: GuardNavigate,
  isLoggedIn: boolean = useMallStore.getState().accessToken != null,
): GuardResult {
  const result = checkAuth(action, isLoggedIn);
  if (!result.allowed) {
    navigate('login', result.pendingReturnTo);
  }
  return result;
}
