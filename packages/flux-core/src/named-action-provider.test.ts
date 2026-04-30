import { describe, expect, it, vi } from 'vitest';
import { createNamedActionProvider } from './named-action-provider';
import type { ActionContext, ActionResult, ActionScope, CompiledActionProgram } from './types';

function createMockProgram(): CompiledActionProgram {
  return {
    nodes: [
      { action: 'noop', payload: {}, targeting: {}, control: {}, source: { action: 'noop' } },
    ],
    isFullyStatic: true,
  };
}

function createMockActionScope(resolveResult?: {
  namespace: string;
  method: string;
  provider: any;
  sourceScopeId: string;
}): ActionScope {
  return {
    id: 'mock-scope',
    resolve: vi.fn((name: string) => {
      if (name.startsWith('__xui_actions__:') && resolveResult) {
        return resolveResult;
      }
      return undefined;
    }),
    registerNamespace: vi.fn(() => () => {}),
    unregisterNamespace: vi.fn(),
    listNamespaces: vi.fn(() => []),
  };
}

describe('createNamedActionProvider', () => {
  it('invokes a known plan via executeProgram', async () => {
    const program = createMockProgram();
    const executeProgram = vi.fn(async () => ({ ok: true, data: 'result' }) as ActionResult);
    const provider = createNamedActionProvider({ myAction: program }, undefined, executeProgram);

    const result = await provider.invoke('myAction', {}, {} as ActionContext);

    expect(result.ok).toBe(true);
    expect(executeProgram).toHaveBeenCalledWith(program, expect.anything());
  });

  it('returns error for unknown method when no parent scope', async () => {
    const executeProgram = vi.fn();
    const provider = createNamedActionProvider({}, undefined, executeProgram);

    const result = await provider.invoke('unknown', {}, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect((result as any).error.message).toContain('Unknown named action: unknown');
    expect(executeProgram).not.toHaveBeenCalled();
  });

  it('falls back to parent scope for unknown method', async () => {
    const program = createMockProgram();
    const parentInvoke = vi.fn(async () => ({ ok: true, data: 'parent-result' }) as ActionResult);
    const parentProvider = {
      kind: 'import' as const,
      invoke: parentInvoke,
      listMethods: () => ['parentAction'],
    };
    const parentScope = createMockActionScope({
      namespace: '__xui_actions__',
      method: 'parentAction',
      provider: parentProvider,
      sourceScopeId: 'parent-scope',
    });
    const executeProgram = vi.fn();
    const provider = createNamedActionProvider(
      { localAction: program },
      parentScope,
      executeProgram,
    );

    const result = await provider.invoke('parentAction', {}, {} as ActionContext);

    expect(result.ok).toBe(true);
    expect(parentInvoke).toHaveBeenCalledWith('parentAction', {}, expect.anything());
    expect(executeProgram).not.toHaveBeenCalled();
  });

  it('prefers local plan over parent scope', async () => {
    const program = createMockProgram();
    const parentInvoke = vi.fn();
    const parentProvider = {
      kind: 'import' as const,
      invoke: parentInvoke,
    };
    const parentScope = createMockActionScope({
      namespace: '__xui_actions__',
      method: 'shared',
      provider: parentProvider,
      sourceScopeId: 'parent-scope',
    });
    const executeProgram = vi.fn(async () => ({ ok: true, data: 'local' }) as ActionResult);
    const provider = createNamedActionProvider({ shared: program }, parentScope, executeProgram);

    const result = await provider.invoke('shared', {}, {} as ActionContext);

    expect(result.ok).toBe(true);
    expect(executeProgram).toHaveBeenCalledWith(program, expect.anything());
    expect(parentInvoke).not.toHaveBeenCalled();
  });

  it('listMethods merges local and parent methods', () => {
    const parentProvider = {
      kind: 'import' as const,
      invoke: vi.fn(),
      listMethods: vi.fn(() => ['parentAction']),
    };
    const parentScope = createMockActionScope({
      namespace: '__xui_actions__',
      method: '__list_methods__',
      provider: parentProvider,
      sourceScopeId: 'parent-scope',
    });
    const provider = createNamedActionProvider(
      { localAction: createMockProgram() },
      parentScope,
      vi.fn(),
    );

    const methods = provider.listMethods!();

    expect(methods).toContain('localAction');
    expect(methods).toContain('parentAction');
  });

  it('has import kind', () => {
    const provider = createNamedActionProvider({}, undefined, vi.fn());
    expect(provider.kind).toBe('import');
  });
});
