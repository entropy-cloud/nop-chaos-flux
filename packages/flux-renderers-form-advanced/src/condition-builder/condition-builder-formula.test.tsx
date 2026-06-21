import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import {
  env,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
} from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import {
  makeEmptyGroup,
  renderGroup,
  testFields,
} from './config-test-support.js';
import type { ConditionGroupValue, ConditionItemValue } from './types.js';
import type { EvaluateConditionFormula } from './condition-builder.js';

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
];

function makeGroupWithItem(itemOverrides?: Partial<ConditionItemValue>): ConditionGroupValue {
  return {
    id: 'root',
    conjunction: 'and',
    children: [
      {
        id: 'item-1',
        left: { type: 'field', field: 'name' },
        op: 'equal',
        right: itemOverrides?.right,
        ...itemOverrides,
      },
    ],
  };
}

describe('E3 condition-builder formula — formulas.enabled value slot', () => {
  it('renders formula value slot (data-slot="condition-formula-value") when formulas.enabled=true', () => {
    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true },
      },
      makeGroupWithItem(),
    );

    expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
  });

  it('writes expression string to ConditionItemValue.right when formula value slot changes', () => {
    const onChange = vi.fn();
    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true },
      },
      makeGroupWithItem(),
      onChange,
    );

    const input = document.querySelector(
      '[data-slot="condition-formula-value"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: '${age + 1}' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            right: '${age + 1}',
          }),
        ],
      }),
    );
  });

  it('falls back to literal value slot when formulas.enabled is false/missing (no regression)', () => {
    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
      },
      makeGroupWithItem(),
    );

    expect(document.querySelector('[data-slot="condition-formula-value"]')).toBeNull();
    expect(document.querySelector('[data-slot="condition-group"]')).not.toBeNull();
  });

  it('uses formula seed string as default right value when adding a condition item', () => {
    const onChange = vi.fn();
    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true, formula: '${defaultValue}' },
      },
      makeEmptyGroup(),
      onChange,
    );

    fireEvent.click(screen.getByText('Add condition'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            right: '${defaultValue}',
          }),
        ],
      }),
    );
  });

  it('does not use formula seed when formulas.enabled is false', () => {
    const onChange = vi.fn();
    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: false, formula: '${defaultValue}' },
      },
      makeEmptyGroup(),
      onChange,
    );

    fireEvent.click(screen.getByText('Add condition'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [
          expect.objectContaining({
            right: undefined,
          }),
        ],
      }),
    );
  });
});

describe('E3 condition-builder formula — formulaForIf group if marker', () => {
  it('marks if input as evaluable expression when formulaForIf.enabled=true', () => {
    renderGroup({
      showIf: true,
      showAndOr: true,
      formulaForIf: { enabled: true },
    });

    expect(document.querySelector('[data-slot="condition-group-if-formula"]')).not.toBeNull();
  });

  it('keeps plain if input marker when formulaForIf is missing (E0d behavior, no regression)', () => {
    renderGroup({
      showIf: true,
      showAndOr: true,
    });

    expect(document.querySelector('[data-slot="condition-group-if-input"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="condition-group-if-formula"]')).toBeNull();
  });

  it('writes if expression string to ConditionGroupValue.if when formulaForIf.enabled=true', () => {
    const onChange = vi.fn();
    renderGroup(
      {
        showIf: true,
        showAndOr: true,
        formulaForIf: { enabled: true },
      },
      makeEmptyGroup(),
      onChange,
    );

    const input = document.querySelector(
      '[data-slot="condition-group-if-formula"]',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: '${age > 18}' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ if: '${age > 18}' }),
    );
  });
});

describe('E3 condition-builder formula — evaluateFormula preview', () => {
  it('calls evaluateFormula for preview when a formula value is present', async () => {
    const evaluateFormula: EvaluateConditionFormula = vi.fn(async (_formula: string) => ({
      value: 42,
      error: false,
    }));

    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true },
      },
      makeGroupWithItem({ right: '${1 + 41}' }),
      undefined,
      { evaluateFormula },
    );

    await waitFor(() => {
      expect(evaluateFormula).toHaveBeenCalledWith('${1 + 41}');
    });
  });

  it('shows evaluated preview result when evaluateFormula succeeds', async () => {
    const evaluateFormula: EvaluateConditionFormula = vi.fn(async () => ({
      value: 42,
      error: false,
    }));

    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true },
      },
      makeGroupWithItem({ right: '${21 * 2}' }),
      undefined,
      { evaluateFormula },
    );

    await waitFor(() => {
      expect(screen.getByText('→ 42')).toBeTruthy();
    });
  });

  it('shows eval error marker and preserves raw string when evaluateFormula returns error', async () => {
    const evaluateFormula: EvaluateConditionFormula = vi.fn(async () => ({
      value: '${broken',
      error: true,
    }));

    const onChange = vi.fn();
    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true },
      },
      makeGroupWithItem({ right: '${broken' }),
      onChange,
      { evaluateFormula },
    );

    await waitFor(() => {
      expect(screen.getByText('⚠ eval error')).toBeTruthy();
    });

    const input = document.querySelector(
      '[data-slot="condition-formula-value"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('${broken');
  });

  it('does not crash when evaluateFormula throws (formula-eval-error Failure Path)', async () => {
    const evaluateFormula: EvaluateConditionFormula = vi.fn(async () => {
      throw new Error('unexpected');
    });

    renderGroup(
      {
        showAndOr: true,
        fields: testFields,
        formulas: { enabled: true },
      },
      makeGroupWithItem({ right: '${anything}' }),
      undefined,
      { evaluateFormula },
    );

    await waitFor(() => {
      expect(evaluateFormula).toHaveBeenCalled();
    });

    expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
  });
});

describe('E3 condition-builder formula — source-based evaluation (integration)', () => {
  it('renders formula value slot when source is configured (source wired through evaluateFormula)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-formula.test.tsx#source-1"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'name', label: 'Name', type: 'text' }],
                formulas: { enabled: true, source: 'contextData' },
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(await screen.findByText('Add condition'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
    });
  });

  it('DESIGN-ACK-NOT-IMPL eliminated: formulas/formulaForIf are consumed at runtime', () => {
    renderGroup(
      {
        showAndOr: true,
        showIf: true,
        fields: testFields,
        formulas: { enabled: true },
        formulaForIf: { enabled: true },
      },
      makeGroupWithItem(),
    );

    expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="condition-group-if-formula"]')).not.toBeNull();
  });
});

describe('E3 condition-builder formula — integration via SchemaRenderer', () => {
  it('renders formula value slot and writes expression back when formulas.enabled=true', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allDefs);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/condition-builder-formula.test.tsx#integration-1"
        schema={
          {
            type: 'form',
            data: {
              filters: { id: 'root', conjunction: 'and', children: [] },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: [{ name: 'status', label: 'Status', type: 'text' }],
                formulas: { enabled: true },
              },
              {
                type: 'form-state-probe',
                name: 'filters',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(await screen.findByText('Add condition'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="condition-formula-value"]')).not.toBeNull();
    });

    const input = document.querySelector(
      '[data-slot="condition-formula-value"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'myExpr' } });

    await waitFor(() => {
      expect(
        JSON.parse(screen.getByTestId('form-state:filters').textContent ?? 'null'),
      ).toMatchObject({
        children: [
          { right: 'myExpr' },
        ],
      });
    });
  });
});
