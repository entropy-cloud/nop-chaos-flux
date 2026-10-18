import React, { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  BaseSchema,
  CompiledDataSource,
  RendererComponentProps,
  RegisteredRendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import {
  createSchemaRenderer,
  useCurrentComponentRegistry,
  useRenderScope,
  useRendererRuntime,
} from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as sharedEnv, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

afterEach(() => {
  cleanup();
});

function makeRenderer(extra: RegisteredRendererDefinition[] = []) {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...extra,
  ]);
}

const formulaCompiler = createFormulaCompiler();

// ---------------------------------------------------------------------------
// FM-3 GAP2 (shard B): form `target` -> component-handle `querySubmit`
// cross-layer delivery. The crud side is unit-tested in isolation; these
// probes pin the seam: a form with `target` must resolve the named handle in
// the component registry and deliver `{ values }` — after a successful
// explicit submit, or directly (debounced) for target-only submitOnChange
// forms — and silently no-op when the target lacks the capability.
// ---------------------------------------------------------------------------

const querySubmitPayloads: Array<unknown> = [];
const probeInvocations: Array<string> = [];

function QueryTargetProbeRenderer(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();
  const cid = props.meta.cid;
  const id = props.id;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }
    return componentRegistry.register(
      {
        id,
        type: 'query-target-probe',
        capabilities: {
          hasMethod(method) {
            return method === 'querySubmit';
          },
          listMethods() {
            return ['querySubmit'];
          },
          async invoke(method, payload) {
            probeInvocations.push(method);
            if (method === 'querySubmit') {
              querySubmitPayloads.push((payload as { values?: unknown } | undefined)?.values);
            }
            return { ok: true };
          },
        },
      },
      { cid },
    );
  }, [componentRegistry, cid, id]);

  return <div data-testid="query-target-probe" />;
}

const queryTargetProbeDefinition: RegisteredRendererDefinition = {
  type: 'query-target-probe',
  component: QueryTargetProbeRenderer,
};

function PlainTargetProbeRenderer(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();
  const cid = props.meta.cid;
  const id = props.id;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }
    return componentRegistry.register(
      {
        id,
        type: 'plain-target-probe',
        capabilities: {
          hasMethod(method) {
            return method === 'refresh';
          },
          listMethods() {
            return ['refresh'];
          },
          async invoke(method) {
            probeInvocations.push(method);
            return { ok: true };
          },
        },
      },
      { cid },
    );
  }, [componentRegistry, cid, id]);

  return <div data-testid="plain-target-probe" />;
}

const plainTargetProbeDefinition: RegisteredRendererDefinition = {
  type: 'plain-target-probe',
  component: PlainTargetProbeRenderer,
};

function resetProbes() {
  querySubmitPayloads.length = 0;
  probeInvocations.length = 0;
}

describe('FM-3 GAP2: form target -> querySubmit cross-layer delivery', () => {
  it('delivers form values to the target component handle after a successful submit', async () => {
    resetProbes();
    const SchemaRenderer = makeRenderer([queryTargetProbeDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://fm3/target-submit"
        schema={
          {
            type: 'form',
            id: 'fm3-target-form',
            target: 'fm3-crud-probe',
            data: { name: 'init' },
            submitAction: { action: 'ajax', args: { url: '/api/fm3', method: 'post' } },
            body: [
              { type: 'input-text', name: 'name', label: 'Name' },
              { type: 'query-target-probe', id: 'fm3-crud-probe' },
              {
                type: 'button',
                label: 'Save',
                onClick: { action: 'component:submit', componentId: 'fm3-target-form' },
              },
            ],
          } as BaseSchema
        }
        env={sharedEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'typed' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(submitCalls.length).toBe(1));
    await waitFor(() => expect(querySubmitPayloads).toHaveLength(1));

    expect(querySubmitPayloads[0]).toEqual({ name: 'typed' });
    expect(probeInvocations).toEqual(['querySubmit']);
  });

  it('delivers values directly (debounced) without submit for target-only submitOnChange forms', async () => {
    resetProbes();
    const SchemaRenderer = makeRenderer([queryTargetProbeDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://fm3/target-only-change"
        schema={
          {
            type: 'form',
            id: 'fm3-target-only-form',
            target: 'fm3-crud-probe-change',
            submitOnChange: true,
            data: { q: 'init' },
            body: [
              { type: 'input-text', name: 'q', label: 'Query' },
              { type: 'query-target-probe', id: 'fm3-crud-probe-change' },
            ],
          } as BaseSchema
        }
        env={sharedEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(querySubmitPayloads).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Query'), { target: { value: 'updated' } });

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(querySubmitPayloads).toHaveLength(1);
    expect(querySubmitPayloads[0]).toEqual({ q: 'updated' });
    expect(probeInvocations).toEqual(['querySubmit']);
    expect(submitCalls).toHaveLength(0);
  });

  it('silently no-ops (no throw, no invoke) when the target handle lacks querySubmit', async () => {
    resetProbes();
    const SchemaRenderer = makeRenderer([plainTargetProbeDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://fm3/target-no-capability"
        schema={
          {
            type: 'form',
            id: 'fm3-plain-target-form',
            target: 'fm3-plain-target',
            data: { q: 'x' },
            submitAction: { action: 'ajax', args: { url: '/api/fm3-plain', method: 'post' } },
            body: [
              { type: 'input-text', name: 'q', label: 'Query' },
              { type: 'plain-target-probe', id: 'fm3-plain-target' },
              {
                type: 'button',
                label: 'Save',
                onClick: { action: 'component:submit', componentId: 'fm3-plain-target-form' },
              },
            ],
          } as BaseSchema
        }
        env={sharedEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(submitCalls.length).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(probeInvocations).toEqual([]);
    expect(screen.getByLabelText('Query')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// FM-3 GAP7 (shard B): input-suggest IME guard family asymmetry probe.
// form.tsx:523 guards Enter-submit with `isComposing || keyCode === 229`
// (paired tests in form-shell-enhancements.test.tsx); ai-sender has its own
// guard + test. input-suggest.tsx handleKeyDown selects the highlighted
// suggestion on bare `key === 'Enter'` with no composition check — the probe
// below pins what actually happens when the Enter that confirms an IME
// candidate arrives while a suggestion is highlighted.
// ---------------------------------------------------------------------------

function StubDataSourceRenderer(props: RendererComponentProps) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const compiledSource = props.templateNode.compiledSources?.[0] as CompiledDataSource | undefined;

  useEffect(() => {
    if (!compiledSource) {
      return;
    }
    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      compiledSource,
    });
    return () => {
      registration.dispose();
    };
  }, [props.id, runtime, scope, compiledSource]);

  return null;
}

const stubDataSourceDefinition: RegisteredRendererDefinition = {
  type: 'data-source',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  component: StubDataSourceRenderer,
  compilation: {
    artifacts: ['data-source'],
  },
};

const SUGGEST_FORM_SCHEMA = {
  type: 'form',
  data: { city: '' },
  body: [
    {
      type: 'data-source',
      action: 'ajax',
      args: { url: '/api/cities', params: { q: '${city}' } },
      name: 'citySuggestions',
      initFetch: false,
      sendOn: 'city.length >= 2',
    } as BaseSchema,
    {
      type: 'input-text',
      name: 'city',
      label: 'City',
      suggestSource: 'citySuggestions',
      suggestDebounce: 50,
      suggestMinInputLength: 2,
    } as BaseSchema,
  ],
} as BaseSchema;

function makeSuggestEnv(): RendererEnv {
  return {
    ...sharedEnv,
    fetcher: async function <T>() {
      const all = [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Apricot', value: 'apricot' },
      ];
      return { status: 0, data: all as T };
    },
  };
}

async function openSuggestionsWithHighlight(input: HTMLInputElement) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'ap' } });
  await waitFor(() => {
    expect(screen.queryByText('Apple')).toBeTruthy();
  });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  const items = document.querySelectorAll('[data-slot="input-suggest-item"]');
  expect(items.length).toBeGreaterThan(0);
  expect((items[0] as HTMLElement).getAttribute('aria-selected')).toBe('true');
}

describe('FM-3 GAP7: input-suggest IME Enter guard probe', () => {
  it('characterization: plain Enter (no composition) selects the highlighted suggestion', async () => {
    const SchemaRenderer = makeRenderer([stubDataSourceDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://fm3/suggest-plain-enter"
        schema={SUGGEST_FORM_SCHEMA}
        env={makeSuggestEnv()}
        formulaCompiler={formulaCompiler}
      />,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    await openSuggestionsWithHighlight(input);

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, bubbles: true });

    await waitFor(() => {
      expect(input.value).toBe('apple');
    });
    await waitFor(() => {
      expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeNull();
    });
  });

  // FM-3 探洞立案：P2 input-suggest IME Enter 无 composing 守卫（form.tsx 修复同族不对称）
  // Probe result (2026-10-18, FM-3 Phase 2, run live before filing): with a
  // suggestion highlighted, `keyDown Enter {isComposing:true, keyCode:229}`
  // commits the highlighted suggestion — input.value went 'ap' -> 'apple' and
  // the popover closed (assertion "expected 'apple' to be 'ap'") — because
  // input-suggest.tsx handleKeyDown matches bare `key === 'Enter'` with no
  // `isComposing`/`keyCode===229` check. In a real CJK IME flow the same
  // keydown confirms the IME candidate, so the field is silently overwritten
  // mid-composition. form.tsx (in-flight guard, form.tsx:523) and ai-sender
  // both guard this family; input-suggest is the unguarded neighbor. The
  // guard change itself is deliberately NOT applied in this session — the
  // concurrent form.tsx fix owns that territory; this probe stays skipped as
  // the filed defect record. Unskip once the guard lands; the assertions
  // below are the target contract and should then pass.
  it.skip('characterization: Enter that confirms an IME candidate must not commit the highlighted suggestion', async () => {
    const SchemaRenderer = makeRenderer([stubDataSourceDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://fm3/suggest-ime-enter"
        schema={SUGGEST_FORM_SCHEMA}
        env={makeSuggestEnv()}
        formulaCompiler={formulaCompiler}
      />,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    await openSuggestionsWithHighlight(input);

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(input.value).toBe('ap');
    expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeTruthy();
  });
});
