export type TabKey = 'home' | 'category' | 'cart' | 'profile';

export type AuthPageKey = 'login' | 'register' | 'forgot';

export interface TabRouteSpec {
  kind: 'tab';
  tab: TabKey;
}

export interface AuthRouteSpec {
  kind: 'auth';
  auth: AuthPageKey;
  returnTo?: string;
}

export interface PageRouteSpec {
  kind: 'page';
  page: string;
  title?: string;
  params?: Record<string, string>;
}

export type RouteSpec = TabRouteSpec | AuthRouteSpec | PageRouteSpec;

export const TAB_ORDER: readonly TabKey[] = ['home', 'category', 'cart', 'profile'];

export const TAB_META: Record<TabKey, { label: string; hash: string }> = {
  home: { label: '首页', hash: 'home' },
  category: { label: '分类', hash: 'category' },
  cart: { label: '购物车', hash: 'cart' },
  profile: { label: '我的', hash: 'profile' },
};

const AUTH_HASH: Record<AuthPageKey, string> = {
  login: 'login',
  register: 'register',
  forgot: 'forgot',
};

export function parseRoute(hash: string): RouteSpec {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart, queryPart] = splitPathAndQuery(path);
  const segments = pathPart.split('/').filter(Boolean);
  const query = parseQuery(queryPart);

  if (segments.length === 0) {
    return { kind: 'tab', tab: 'home' };
  }

  if (segments[0] === 'tab') {
    const tab = (segments[1] as TabKey) ?? 'home';
    if (TAB_ORDER.includes(tab)) return { kind: 'tab', tab };
    return { kind: 'tab', tab: 'home' };
  }

  if (segments[0] === 'auth') {
    const auth = (segments[1] as AuthPageKey) ?? 'login';
    if (auth in AUTH_HASH) {
      const returnTo = query.returnTo;
      return { kind: 'auth', auth, ...(returnTo ? { returnTo } : {}) };
    }
    return { kind: 'auth', auth: 'login' };
  }

  if (segments[0] === 'page') {
    const page = segments[1] ?? '';
    const title = query.title;
    const { returnTo: _r, title: _t, ...params } = query;
    return {
      kind: 'page',
      page,
      ...(title ? { title } : {}),
      ...(Object.keys(params).length > 0 ? { params } : {}),
    };
  }

  return { kind: 'tab', tab: 'home' };
}

function splitPathAndQuery(path: string): [string, string] {
  const idx = path.indexOf('?');
  if (idx === -1) return [path, ''];
  return [path.slice(0, idx), path.slice(idx + 1)];
}

function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!query) return out;
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const k = eq === -1 ? pair : pair.slice(0, eq);
    const v = eq === -1 ? '' : pair.slice(eq + 1);
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}

export function buildRoute(spec: RouteSpec): string {
  switch (spec.kind) {
    case 'tab':
      return `#/tab/${spec.tab}`;
    case 'auth': {
      const base = `#/auth/${AUTH_HASH[spec.auth]}`;
      return spec.returnTo ? `${base}?returnTo=${encodeURIComponent(spec.returnTo)}` : base;
    }
    case 'page': {
      const params = new URLSearchParams();
      if (spec.title) params.set('title', spec.title);
      if (spec.params) {
        for (const [k, v] of Object.entries(spec.params)) params.set(k, v);
      }
      const qs = params.toString();
      return qs ? `#/page/${spec.page}?${qs}` : `#/page/${spec.page}`;
    }
  }
}

export function activeTabFromRoute(route: RouteSpec): TabKey {
  return route.kind === 'tab' ? route.tab : 'home';
}
