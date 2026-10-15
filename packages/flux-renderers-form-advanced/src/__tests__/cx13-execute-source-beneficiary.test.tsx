import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ApiRequestContext,
  RendererComponentProps,
  RegisteredRendererDefinition,
  RendererEnv,
  RendererRuntime,
} from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

/**
 * CX-13 (plan 591) Phase 1/2 pins — `helpers.executeSource` scope-honoring
 * contract, anchored at the condition-builder.tsx:103 beneficiary call
 * (`helpers.executeSource(sourceSchema, { scope })`).
 *
 * Pin A pins the :103 face end-to-end (formula source evaluated against the
 * caller scope, scope/dispose pairing untouched).
 *
 * Pin B is the C2 beneficiary discriminator written against the POST-C2
 * contract: a caller-supplied patched scope passed via the options bag must
 * reach the executed action. Pre-C2 the renderer-helpers wiring hardcodes
 * `ctx: mergeActionContext(input)` (render scope), so the patched scope is
 * silently clobbered and this pin is RED (documented red leg). Post-C2
 * (`ctx: mergeActionContext(input, { scope, signal })`) it is GREEN.
 *
 * Pin C pins existing-caller behavior preservation: calling executeSource
 * WITHOUT options resolves the render scope, before and after C2.
 */

installFormAdvancedTestHooks();

function ExecuteSourceProbeRenderer(props: RendererComponentProps) {
  const helpers = props.helpers;
  const mode = String((props.props as { mode?: string }).mode ?? 'patched');
  const [result, setResult] = React.useState('idle');

  React.useEffect(() => {
    let disposed = false;
    const run = async () => {
      const patched = helpers.createScope({ needle: 'patched-value' });
      try {
        const source = {
          type: 'source',
          action: 'ajax',
          args: { url: '/api/cx13-probe', method: 'get' },
        } as never;
        const res = await (mode === 'no-options'
          ? helpers.executeSource(source)
          : helpers.executeSource(source, { scope: patched }));
        if (!disposed) {
          setResult(JSON.stringify((res as { data?: unknown }).data ?? null));
        }
      } catch {
        if (!disposed) {
          setResult('error');
        }
      } finally {
        helpers.disposeScope(patched.id);
      }
    };
    void run();
    return () => {
      disposed = true;
    };
  }, [helpers, mode]);

  return <pre data-testid="execute-source-probe">{result}</pre>;
}

const executeSourceProbe: RegisteredRendererDefinition = {
  type: 'execute-source-probe',
  component: ExecuteSourceProbeRenderer,
};

function makeProbeEnv(): { env: RendererEnv; seenNeedles: (unknown)[] } {
  const seenNeedles: (unknown)[] = [];
  const probeEnv: RendererEnv = {
    fetcher: async function <T>(_api: unknown, ctx: ApiRequestContext) {
      seenNeedles.push((ctx.scope.readVisible() as { needle?: unknown }).needle ?? null);
      return { status: 0, data: { seen: (ctx.scope.readVisible() as { needle?: unknown }).needle ?? null } as T };
    },
    notify: () => undefined,
  };
  return { env: probeEnv, seenNeedles };
}

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  executeSourceProbe,
];

afterEach(() => cleanup());

function renderSchema(body: Record<string, unknown>[], envOverride?: RendererEnv) {
  const holder: { runtime: RendererRuntime | null } = { runtime: null };
  const SchemaRenderer = createSchemaRenderer(allDefs);
  render(
    <SchemaRenderer
      schemaUrl={`test://cx13-execute-source-beneficiary#${body.map((item) => item.type).join('+')}`}
      schema={{ type: 'page', body } as never}
      data={{ contextData: { age: 30 } }}
      env={envOverride ?? env}
      formulaCompiler={formulaCompiler}
      onRuntimeChange={(runtime) => {
        holder.runtime = runtime as RendererRuntime;
      }}
    />,
  );
  return holder;
}

describe('CX-13 condition-builder :103 beneficiary face', () => {
  it('evaluates source-backed formulas through helpers.executeSource against the caller scope', async () => {
    const holder = renderSchema([
      {
        type: 'condition-builder',
        name: 'filters',
        label: 'Filters',
        fields: [{ name: 'status', label: 'Status', type: 'text' }],
        formulas: { enabled: true, source: '${contextData}' },
      },
    ]);
    expect(holder.runtime).not.toBeNull();

    const runtime = holder.runtime!;
    const executeSourceSpy = vi.spyOn(runtime, 'executeSource');

    fireEvent.click(await screen.findByText('Add condition'));
    await waitFor(() => {
      expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
    });

    const input = document.querySelector(
      '[data-slot="condition-formula-value"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '${age + 1}' } });

    await waitFor(() => {
      expect(screen.getByText('→ 31')).toBeTruthy();
    });

    expect(executeSourceSpy).toHaveBeenCalled();
    const call = executeSourceSpy.mock.calls[0][0] as {
      source: unknown;
      scope: unknown;
      ctx: unknown;
    };
    // The schema compiler resolves '${contextData}' before the renderer builds
    // the one-shot source descriptor, so the formula arrives pre-evaluated.
    expect(call.source).toMatchObject({ type: 'source' });
    expect(call.scope).toBeTruthy();
    expect(call.ctx).toBeTruthy();
  });
});

describe('CX-13 helpers.executeSource scope-honoring wiring (C2 beneficiary discriminator)', () => {
  it('pins the caller-supplied patched scope through to the executed action', async () => {
    const { env: probeEnv } = makeProbeEnv();
    renderSchema([{ type: 'execute-source-probe', mode: 'patched' }], probeEnv);

    await waitFor(
      () => {
        expect(screen.getByTestId('execute-source-probe').textContent).toBe(
          JSON.stringify({ seen: 'patched-value' }),
        );
      },
      { timeout: 3000 },
    );
  });

  it('preserves existing-caller behavior: no options resolves the render scope', async () => {
    const { env: probeEnv, seenNeedles } = makeProbeEnv();
    renderSchema([{ type: 'execute-source-probe', mode: 'no-options' }], probeEnv);

    await waitFor(
      () => {
        expect(screen.getByTestId('execute-source-probe').textContent).not.toBe('idle');
      },
      { timeout: 3000 },
    );

    expect(seenNeedles.length).toBeGreaterThan(0);
    expect(seenNeedles.every((needle) => needle === null)).toBe(true);
    expect(screen.getByTestId('execute-source-probe').textContent).toBe(
      JSON.stringify({ seen: null }),
    );
  });
});
