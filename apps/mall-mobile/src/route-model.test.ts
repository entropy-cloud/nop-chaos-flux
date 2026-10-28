import { describe, expect, it } from 'vitest';
import {
  parseRoute,
  buildRoute,
  activeTabFromRoute,
  TAB_ORDER,
  type RouteSpec,
} from './route-model';

describe('route-model parseRoute / buildRoute roundtrip', () => {
  const cases: RouteSpec[] = [
    { kind: 'tab', tab: 'home' },
    { kind: 'tab', tab: 'category' },
    { kind: 'tab', tab: 'cart' },
    { kind: 'tab', tab: 'profile' },
    { kind: 'auth', auth: 'login' },
    { kind: 'auth', auth: 'register' },
    { kind: 'auth', auth: 'forgot' },
    { kind: 'auth', auth: 'login', returnTo: '/tab/cart' },
    { kind: 'page', page: 'product', title: '商品详情' },
    {
      kind: 'page',
      page: 'product',
      title: '商品',
      params: { id: '123' },
    },
  ];

  for (const spec of cases) {
    it(`roundtrips ${spec.kind} (${JSON.stringify(spec)})`, () => {
      const hash = buildRoute(spec);
      const back = parseRoute(hash);
      expect(back).toEqual(spec);
    });
  }

  it('default route is home tab', () => {
    expect(parseRoute('#/')).toEqual({ kind: 'tab', tab: 'home' });
    expect(parseRoute('')).toEqual({ kind: 'tab', tab: 'home' });
  });

  it('unknown tab falls back to home', () => {
    expect(parseRoute('#/tab/nonsense')).toEqual({ kind: 'tab', tab: 'home' });
  });

  it('unknown auth page falls back to login', () => {
    expect(parseRoute('#/auth/nonsense')).toEqual({ kind: 'auth', auth: 'login' });
  });

  it('unknown segment falls back to home tab', () => {
    expect(parseRoute('#/random/segments')).toEqual({ kind: 'tab', tab: 'home' });
  });

  it('encodes returnTo with special characters', () => {
    const hash = buildRoute({ kind: 'auth', auth: 'login', returnTo: '/page/product?id=a&b=c' });
    expect(hash).toContain('returnTo=');
    const parsed = parseRoute(hash);
    expect(parsed).toEqual({ kind: 'auth', auth: 'login', returnTo: '/page/product?id=a&b=c' });
  });
});

describe('activeTabFromRoute', () => {
  it('returns the tab for tab routes', () => {
    for (const tab of TAB_ORDER) {
      expect(activeTabFromRoute({ kind: 'tab', tab })).toBe(tab);
    }
  });

  it('falls back to home for non-tab routes', () => {
    expect(activeTabFromRoute({ kind: 'auth', auth: 'login' })).toBe('home');
    expect(activeTabFromRoute({ kind: 'page', page: 'x' })).toBe('home');
  });
});
