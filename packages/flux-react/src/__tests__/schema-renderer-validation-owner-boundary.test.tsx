import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ScopeValidationStateSnapshot, ValidationScopeRuntime } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer.js';
import { useCurrentForm, useCurrentValidationScope } from '../hooks.js';
import { env, formRenderer, pageRenderer } from '../test-support-core.js';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRuntime } from '@nop-chaos/flux-runtime';
import { createRendererRegistry } from '@nop-chaos/flux-core';

const validationOwnerProbeRenderer = {
  type: 'validation-owner-probe',
  component: function ValidationOwnerProbe() {
    const validationOwner = useCurrentValidationScope();
    return <span data-testid="validation-owner-id">{validationOwner?.scopeId ?? ''}</span>;
  },
};

const testState: {
  firstPublishedScopeState: ScopeValidationStateSnapshot | undefined;
  latestValidationOwner: ValidationScopeRuntime | undefined;
} = {
  firstPublishedScopeState: undefined,
  latestValidationOwner: undefined,
};

const validationOwnerStateProbeRenderer: RendererDefinition = {
  type: 'validation-owner-state-probe',
  component: function ValidationOwnerStateProbe() {
    const validationOwner = useCurrentValidationScope();

    if (validationOwner) {
      testState.latestValidationOwner = validationOwner;
      testState.firstPublishedScopeState ??= validationOwner.getScopeState();
    }

    return <span data-testid="validation-owner-state-probe">probe</span>;
  },
};

const nestedOwnerProbeState: {
  validationOwnerScopeId: string | undefined;
  currentFormScopeId: string | undefined;
} = {
  validationOwnerScopeId: undefined,
  currentFormScopeId: undefined,
};

const nestedFormOwnerProbeRenderer: RendererDefinition = {
  type: 'nested-form-owner-probe',
  component: function NestedFormOwnerProbe() {
    const validationOwner = useCurrentValidationScope();
    const currentForm = useCurrentForm();

    nestedOwnerProbeState.validationOwnerScopeId = validationOwner?.scopeId;
    nestedOwnerProbeState.currentFormScopeId = currentForm?.scopeId;

    return <span data-testid="nested-form-owner-probe">probe</span>;
  },
};

const fieldProbeRenderer: RendererDefinition = {
  type: 'field-probe',
  component: () => <span data-testid="field-probe">field</span>,
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [{ kind: 'required' as const }];
    },
  },
};

const embeddedParentScope = {
  id: 'embedded-parent',
  path: '$parent',
  get: () => undefined,
  has: () => false,
  readOwn: () => ({}),
  readVisible: () => ({}),
  materializeVisible: () => ({}),
  value: {},
  update: () => undefined,
  merge: () => undefined,
} as any;

describe('createSchemaRenderer validation owner boundary behavior', () => {
  it('only exposes page fallback validation owner for page-owned root renders', () => {
    testState.firstPublishedScopeState = undefined;
    testState.latestValidationOwner = undefined;

    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      validationOwnerProbeRenderer,
      validationOwnerStateProbeRenderer,
      fieldProbeRenderer,
    ]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [{ type: 'validation-owner-probe' }, { type: 'validation-owner-state-probe' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByTestId('validation-owner-id').textContent).toBe('page-root-validation');
    expect(testState.firstPublishedScopeState).toMatchObject({
      lifecycleState: 'bootstrapping',
      ready: false,
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [{ type: 'validation-owner-probe' }, { type: 'validation-owner-state-probe' }],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={embeddedParentScope}
      />,
    );

    expect(screen.getByTestId('validation-owner-id').textContent).toBe('');
  });

  it('promotes the page-root owner from bootstrapping to active after the root validation plan attaches', async () => {
    testState.firstPublishedScopeState = undefined;
    testState.latestValidationOwner = undefined;

    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      validationOwnerProbeRenderer,
      validationOwnerStateProbeRenderer,
      fieldProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            { type: 'validation-owner-probe' },
            { type: 'validation-owner-state-probe' },
            { type: 'field-probe', name: 'email' },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByTestId('validation-owner-id').textContent).toBe('page-root-validation');
    expect(testState.firstPublishedScopeState).toMatchObject({
      lifecycleState: 'bootstrapping',
      ready: false,
    });

    await waitFor(() => {
      expect(testState.latestValidationOwner?.getScopeState()).toMatchObject({
        lifecycleState: 'active',
        ready: true,
      });
    });

    await screen.findByTestId('field-probe');
  });

  it('prefers the current form owner over an ancestor validation owner', async () => {
    nestedOwnerProbeState.validationOwnerScopeId = undefined;
    nestedOwnerProbeState.currentFormScopeId = undefined;

    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      nestedFormOwnerProbeRenderer,
      fieldProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema-validation-owner/nested-form"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              body: [
                { type: 'field-probe', name: 'email' },
                { type: 'nested-form-owner-probe' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(nestedOwnerProbeState.validationOwnerScopeId).toBe(
        nestedOwnerProbeState.currentFormScopeId,
      );
    });
  });

  it('keeps managed surface-root owners bootstrapping when the opened body has no compiled validation plan', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([pageRenderer, validationOwnerProbeRenderer]),
      env,
      expressionCompiler: createFormulaCompiler() as any,
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const surfaceId = surfaceRuntime.open({
      kind: 'dialog',
      runtime,
      scope: runtime.createChildScope(page.scope, { dialogId: 'd1' }, { pathSuffix: 'dialog' }),
      surface: {
        title: 'Dialog',
        body: [{ type: 'validation-owner-probe' }],
      },
    });

    const entry = surfaceRuntime.store.getState().entries.find((item) => item.id === surfaceId);
    expect(entry?.validationOwner?.getScopeState()).toMatchObject({
      lifecycleState: 'bootstrapping',
      ready: false,
    });
    expect(entry?.validationOwner?.validation).toBeUndefined();
  });
});
