import { describe, expect, it, vi, afterEach } from 'vitest';
import { createRuntimeSourceRegistry } from '../async-data/source-registry';

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('logs refresh rejections instead of swallowing them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refresh = vi.fn().mockRejectedValue(new Error('refresh failed'));
    let emitChange: ((change: { paths: string[] }) => void) | undefined;

    const scope = {
      id: 'scope-1',
      store: {
        subscribe(listener: (change: { paths: string[] }) => void) {
          emitChange = listener;
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
        dependsOn: ['query'],
        formula: { isStatic: true, value: 1 },
        targetPath: { isStatic: true, value: 'result' },
      } as any,
    });

    registration.controller.refresh = refresh as any;
    emitChange?.({ paths: ['query'] });
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith('[source-registry] refresh failed', expect.any(Error));
    registration.dispose();
  });
});
