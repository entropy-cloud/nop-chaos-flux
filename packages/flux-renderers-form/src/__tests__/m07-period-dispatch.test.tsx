import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(formRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://m07-period"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('M-07: period family dispatches kind via per-type wrappers, not a runtime schema.type switch', () => {
  it('renders the correct data-period-kind for each renderer type', async () => {
    const cases: Array<{ type: 'input-month' | 'input-quarter' | 'input-year'; kind: string }> = [
      { type: 'input-month', kind: 'month' },
      { type: 'input-quarter', kind: 'quarter' },
      { type: 'input-year', kind: 'year' },
    ];

    for (const c of cases) {
      cleanup();
      renderSchema({
        type: 'form',
        id: 'f',
        data: {},
        body: [{ type: c.type, name: 'p', label: 'P' }],
      } as BaseSchema);
      await waitFor(() => {
        expect(document.querySelector('[data-period-kind]')?.getAttribute('data-period-kind')).toBe(
          c.kind,
        );
      });
    }
  });

  it('registers a distinct component per period renderer type (no shared switch component)', () => {
    // M-07: the declarative-configuration principle forbids runtime
    // `schema.type` switches. Each period type must map to its own thin wrapper
    // component rather than a single component that branches on schema.type.
    const periodDefs = formRendererDefinitions.filter(
      (d) =>
        d.type === 'input-month' || d.type === 'input-quarter' || d.type === 'input-year',
    );
    expect(periodDefs.length).toBe(3);
    const components = periodDefs.map((d) => d.component);
    expect(new Set(components).size).toBe(3);
    expect(periodDefs.map((d) => d.type).sort()).toEqual([
      'input-month',
      'input-quarter',
      'input-year',
    ]);
  });
});

