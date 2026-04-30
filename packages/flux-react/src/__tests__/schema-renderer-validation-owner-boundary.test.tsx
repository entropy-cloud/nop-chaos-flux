import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '../schema-renderer';
import { useCurrentValidationScope } from '../hooks';
import { env, pageRenderer } from '../test-support-core';

const validationOwnerProbeRenderer = {
  type: 'validation-owner-probe',
  component: function ValidationOwnerProbe() {
    const validationOwner = useCurrentValidationScope();
    return <span data-testid="validation-owner-id">{validationOwner?.scopeId ?? ''}</span>;
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
    const SchemaRenderer = createSchemaRenderer([pageRenderer, validationOwnerProbeRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'page', body: [{ type: 'validation-owner-probe' }] }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByTestId('validation-owner-id').textContent).toBe('page-root-validation');

    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{ type: 'page', body: [{ type: 'validation-owner-probe' }] }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        parentScope={embeddedParentScope}
      />,
    );

    expect(screen.getByTestId('validation-owner-id').textContent).toBe('');
  });
});
