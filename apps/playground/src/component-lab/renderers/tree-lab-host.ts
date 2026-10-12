/**
 * Shared lazy-children host for the tree lab pages (input-tree / tree-select).
 *
 * Extracted from the twin copies that used to live inline in both pages
 * (WA-clab-003): the factory returns a FRESH per-node fail counter on every
 * call, so each lab page keeps an independent retry state while sharing one
 * implementation. orgTreeOptions is the single-sourced fixture both pages
 * render.
 *
 * Endpoints: /api/lazy-ok returns children for the expanded node;
 * /api/lazy-fail rejects the FIRST call per node, then succeeds (retry proof).
 */

export const orgTreeOptions = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [
      { label: 'Frontend', value: 'frontend', children: [] },
      { label: 'Backend', value: 'backend', children: [] },
      { label: 'Platform', value: 'platform', children: [] },
    ],
  },
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'UX Research', value: 'ux', children: [] },
      { label: 'Brand', value: 'brand', children: [] },
    ],
  },
  {
    label: 'Operations',
    value: 'ops',
    children: [
      { label: 'DevOps', value: 'devops', children: [] },
      { label: 'Support', value: 'support', children: [] },
    ],
  },
];

export function createLazyTreeHostEnv() {
  const lazyFailCalls = new Map<string, number>();
  return {
    lazyFailCalls,
    fetcher: async <T,>(
      api: { url?: string },
      ctx?: { scope?: { readOwn?: () => Record<string, unknown> } },
    ) => {
      const body: Record<string, unknown> = ctx?.scope?.readOwn?.() ?? {};
      const url = api?.url;
      const parent = body.expandedNodeValue;
      if (url === '/api/lazy-ok') {
        return {
          status: 0,
          data: [
            { label: `Sub A of ${parent}`, value: `${parent}-a` },
            { label: `Sub B of ${parent}`, value: `${parent}-b` },
          ] as T,
        };
      }
      if (url === '/api/lazy-fail') {
        const key = String(parent ?? '');
        const calls = (lazyFailCalls.get(key) ?? 0) + 1;
        lazyFailCalls.set(key, calls);
        if (calls <= 1) {
          return { status: 500, data: { message: 'Lazy load failed (first attempt)' } as T };
        }
        return {
          status: 0,
          data: [{ label: `Retried child of ${parent}`, value: `${parent}-r` }] as T,
        };
      }
      return { status: 0, data: null as T };
    },
  };
}
