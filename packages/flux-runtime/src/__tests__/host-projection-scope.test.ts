import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { env } from './test-fixtures.js';

describe('createRendererRuntime host projection scope', () => {
  it('replaces projected host snapshots instead of merging stale keys', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const hostScope = runtime.createHostProjectionScope({
      parentScope: page.scope,
      projection: {
        host: { status: 'ready' },
        stale: 'remove-me',
      },
      path: '$.body[0]',
      scopeLabel: 'host',
    });

    expect(hostScope.readOwn()).toEqual({
      host: { status: 'ready' },
      stale: 'remove-me',
    });

    hostScope.replace?.({
      host: { status: 'updated' },
    });

    expect(hostScope.readOwn()).toEqual({
      host: { status: 'updated' },
    });
    expect(JSON.stringify(hostScope.materializeVisible())).not.toContain('remove-me');
  });

  it('rejects writes to projected host fields while allowing local writes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const hostScope = runtime.createHostProjectionScope({
      parentScope: page.scope,
      projection: {
        host: { status: 'ready' },
      },
      path: '$.body[0]',
      scopeLabel: 'host',
    });

    expect(() => hostScope.update('host.status', 'mutated')).toThrow(
      'Cannot write projected host field: host.status',
    );

    hostScope.update('local.note', 'ok');

    expect(hostScope.materializeVisible()).toMatchObject({
      pageValue: 'root',
      host: { status: 'ready' },
      local: { note: 'ok' },
    });
  });
});
