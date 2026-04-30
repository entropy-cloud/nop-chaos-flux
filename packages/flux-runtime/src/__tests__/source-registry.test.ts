import { describe, expect, it, vi } from 'vitest';
import { createRuntimeSourceRegistry } from '../async-data/source-registry';

describe('createRuntimeSourceRegistry', () => {
  it('does not hit a TDZ when scope subscribe synchronously emits during registration', () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn();

    const scope = {
      id: 'scope-1',
      store: {
        subscribe(listener: (change: { paths: string[] }) => void) {
          listener({ paths: ['query'] });
          return () => undefined;
        },
      },
    } as any;

    const registry = createRuntimeSourceRegistry({
      runtime: {
        env: {},
        expressionCompiler: {
          evaluateValue: (value: { value?: unknown }) => value.value,
          compileValue: (value: unknown) => ({ isStatic: true, value }),
        },
      } as any,
      apiCache: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      } as any,
      asyncGovernance: undefined,
      executeApiRequest: vi.fn(),
    });

    const registration = registry.registerDataSource({
      id: 'source-1',
      scope,
      compiledSource: {
        kind: 'formula',
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'query' },
      } as any,
    });

    expect(registration.id).toBe('source-1');
    registration.dispose();
    expect(stop).not.toHaveBeenCalled();
    void refresh;
  });
});
