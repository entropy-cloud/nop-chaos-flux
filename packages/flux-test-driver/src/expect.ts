import { escapeAttr } from './escape-attr.js';
import type { AssertCheck, DebuggerApiView, EventExpectation, ExpectApi, SnapshotPathExpectation } from './types.js';

type Notify = (check: AssertCheck) => void;

type InspectView = NonNullable<DebuggerApiView['inspectByCid']> extends (...args: never[]) => infer R ? NonNullable<R> : never;

export function createExpect(getApi: () => DebuggerApiView | undefined, notify: Notify): ExpectApi {
  const check = (result: AssertCheck) => {
    notify(result);
    return result;
  };

    const requireInspect = (id: string | number): InspectView => {
    const api = getApi();
    if (!api) throw new Error('kernel-not-attached: no __NOP_DEBUGGER_API__');
    const inspect = typeof id === 'number' ? api.inspectByCid?.(id) : resolveBySelector(api, id);
    if (!inspect) {
      throw new Error(`kernel-not-attached: cannot resolve cid "${id}"`);
    }
    return inspect;
  };

  const cidExpectation = (id: string | number) => {
    const readMeta = () => requireInspect(id).metaSummary ?? {};
    const readProps = () => requireInspect(id).propsSummary ?? {};
    const renderedCheck = (expected: boolean, because?: string): AssertCheck => {
      let inspect: InspectView;
      try {
        inspect = requireInspect(id);
      } catch (err) {
        return check({ passed: false, kind: 'rendered', actual: null, expected, because: String(err) });
      }
      return check({
        passed: inspect.mounted === expected,
        kind: 'rendered',
        actual: inspect.mounted,
        expected,
        because: inspect.mounted === expected ? undefined : `${because ? `${because} — ` : ''}cid ${id} mounted=${inspect.mounted}`,
      });
    };
    return {
      async meta(expected: Record<string, unknown>) {
        const actual = readMeta();
        const mismatches = Object.entries(expected).filter(([key, value]) => actual[key] !== value);
        return check({
          passed: mismatches.length === 0,
          kind: 'meta',
          actual,
          expected,
          because: mismatches.length === 0 ? undefined : `meta mismatch: ${mismatches.map(([k]) => k).join(',')}`,
        });
      },
      async prop(name: string, expected: unknown) {
        const actual = (readProps() as Record<string, unknown>)[name];
        return check({
          passed: actual === expected,
          kind: 'prop',
          actual,
          expected,
          because: actual === expected ? undefined : `prop ${name} actual=${JSON.stringify(actual)}`,
        });
      },
      rendered: async () => renderedCheck(true),
      not: {
        rendered: async (options?: { because?: string }) => renderedCheck(false, options?.because),
      },
    };
  };

  return {
    cid: cidExpectation,
    scope(path) {
      return {
        async toEqual(expected: unknown, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }) {
          const api = getApi();
          const settled = await poll(async () => {
            try {
              return readScopePath(api, path);
            } catch {
              return sentinelMissing;
            }
          }, options?.timeoutMs ?? 5_000, options?.intervalMs ?? 100);
          const actual = settled === sentinelMissing ? undefined : settled;
          return check({
            passed: settled !== sentinelMissing && deepEqual(actual, expected),
            kind: 'scope',
            actual,
            expected,
            because: settled === sentinelMissing ? `scope path not found: ${path}` : undefined,
          });
        },
      };
    },
    event(name): EventExpectation {
      return {
        async ended(options) {
          const api = getApi();
          const events = api?.queryEvents?.({ kind: name, limit: 50 }) ?? [];
          const wanted = options?.status;
          const match = events.find((event) => (wanted ? event.status === wanted : true));
          return check({
            passed: Boolean(match),
            kind: 'event',
            actual: match ?? null,
            expected: wanted ?? name,
            because: match ? undefined : `no ${name} event${wanted ? ` with status ${wanted}` : ''}`,
          });
        },
      };
    },
    snapshotPath(path): SnapshotPathExpectation {
      return {
        async writtenAtStep(step) {
          const api = getApi();
          const snapshot = api?.getSnapshotAt?.(step) as { scopes?: Record<string, Record<string, unknown>> } | undefined;
          const found = findInSnapshot(snapshot, path);
          return check({
            passed: found.present,
            kind: 'snapshot-path',
            actual: found.value,
            expected: `present at epoch ${step}`,
            because: found.present ? undefined : `path ${path} not present at epoch ${step}`,
          });
        },
      };
    },
  };
}

const sentinelMissing = Symbol('scope-path-missing');

function readScopePath(api: DebuggerApiView | undefined, path: string): unknown {
  if (!api) throw new Error('kernel-not-attached');
  const snapshot = api.getSnapshot() as { scopes?: Record<string, Record<string, unknown>> } | undefined;
  const [head, ...rest] = path.split('.');
  const scope = snapshot?.scopes?.[head];
  let current: unknown = scope;
  for (const segment of rest) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      throw new Error(`scope path not found: ${path}`);
    }
  }
  if (current === undefined) throw new Error(`scope path not found: ${path}`);
  return current;
}

async function poll<T>(read: () => T, timeoutMs: number, intervalMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = read();
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = read();
    if (value !== sentinelMissing) return value;
  }
  return value;
}

function findInSnapshot(snapshot: unknown, path: string): { present: boolean; value: unknown } {
  const segments = path.split('.');
  const walk = (root: unknown, keys: string[]): { present: boolean; value: unknown } => {
    let current: unknown = root;
    for (const segment of keys) {
      if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return { present: false, value: undefined };
      }
    }
    return { present: current !== undefined, value: current };
  };
  const scoped = snapshot && typeof snapshot === 'object' ? (snapshot as { scopes?: Record<string, unknown> }).scopes : undefined;
  const direct = walk(snapshot, segments);
  if (direct.present) return direct;
  if (scoped && scoped[segments[0]!] !== undefined) {
    return walk(scoped[segments[0]!], segments.slice(1));
  }
  return direct;
}

function resolveBySelector(api: DebuggerApiView, id: string): InspectView | undefined {
  const numeric = Number(id);
  if (!Number.isNaN(numeric) && /^\d+$/.test(id)) {
    return api.inspectByCid?.(numeric);
  }
  const element =
    document.querySelector(`[data-cid="${escapeAttr(id)}"]`) ?? document.querySelector(`[data-testid="${escapeAttr(id)}"]`);
  return element ? api.inspectByElement?.(element) : undefined;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
