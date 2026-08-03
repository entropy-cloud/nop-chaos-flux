import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formStateProbeRenderer, scopeStateProbeRenderer } from '../test-support.js';
import { formAdvancedRendererDefinitions, conditionBuilderRendererDefinition } from '../index.js';

/**
 * C3.3 P1-3 guard: every schema-declared prop must be either a universal
 * framework key, or registered in the renderer definition's `fields`, or an
 * explicitly adjudicated exception. This freezes the adjudication that removed
 * the phantom declarations (schema type says X but zero implementation consumes
 * X) from `condition-builder/types.ts` — the same contract-drift class as
 * C3.2 P1-2.
 *
 * Deliberate exceptions:
 * - ConditionCustomOperator.values / ConditionCustomOperatorValueField:
 *   declared but not yet consumed by the value editor — explicitly documented
 *   as a future extension point in design.md §7.2 ("当前 ValueInput 尚未消费此
 *   字段做控件渲染…后续可扩展"). Kept as a documented extension point, not a
 *   silent capability claim.
 * - title / required / value / name / label: universal BaseSchema /
 *   BoundFieldSchemaBase keys (title is a BaseSchema redeclaration).
 */
const UNIVERSAL_KEYS = new Set([
  // BaseSchema
  'type', 'id', 'name', 'label', 'title', 'className', 'frameClassName',
  'classAliases', 'when', 'visible', 'hidden', 'disabled', 'testid',
  'frameWrap', 'validateOn', 'showErrorOn', 'onMount', 'onUnmount',
  'xui:imports',
  // BoundFieldSchemaBase
  'readOnly', 'required', 'mode', 'labelAlign', 'labelWidth', 'hint',
  'description', 'remark', 'labelRemark', 'labelClassName', 'inputClassName',
  'descriptionClassName',
  // formFieldRules extras
  'value',
]);

/** Keys consumed by the renderer but not registered at definition level
 *  (nested operator/field metadata shapes). */
const CONSUMED_NESTED_KEYS: Record<string, string[]> = {
  BaseConditionField: ['name', 'label', 'type', 'placeholder', 'operators', 'defaultOp'],
  ConditionTextField: ['type'],
  ConditionNumberField: ['type'],
  ConditionDateField: ['type'],
  ConditionTimeField: ['type'],
  ConditionDateTimeField: ['type'],
  ConditionSelectField: ['type', 'options', 'multiple'],
  ConditionBooleanField: ['type', 'trueLabel', 'falseLabel'],
  ConditionCustomField: ['type', 'value'],
  ConditionFieldGroup: ['type', 'label', 'children'],
  ConditionCustomOperator: ['label', 'value'],
  ConditionOperatorOverrides: ['labels', 'operatorsByType', 'defaultOpByType'],
  ConditionFormulaConfig: ['enabled', 'formula', 'source'],
};

/** Documented future extension point (design.md §7.2), kept in the type. */
const DOCUMENTED_FUTURE_KEYS: Record<string, string[]> = {
  ConditionCustomOperator: ['values'],
  ConditionCustomOperatorValueField: ['type', 'name', 'label', 'placeholder'],
};

const typesPath = join(import.meta.dirname, '..', 'condition-builder', 'types.ts');
const typesSource = readFileSync(typesPath, 'utf8');

function parseInterfaceKeys(interfaceName: string): string[] {
  const pattern = new RegExp(`export interface ${interfaceName}[^{]*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = typesSource.match(pattern);
  if (!match) {
    throw new Error(`interface ${interfaceName} not found in condition-builder/types.ts`);
  }

  const keys: string[] = [];
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^\s{2}(?:'([^']+)'|([A-Za-z0-9_-]+))\??:/);
    if (keyMatch) {
      keys.push(keyMatch[1] ?? keyMatch[2]);
    }
  }
  return keys;
}

function registeredDefinitionKeys(): string[] {
  return (conditionBuilderRendererDefinition.fields ?? [])
    .flatMap((field) => (field.key ? [field.key] : []));
}

describe('C3.3 condition-builder schema contract honesty (P1-3)', () => {
  it('every declared ConditionBuilderSchema key is registered or universal', () => {
    const declared = parseInterfaceKeys('ConditionBuilderSchema');
    const registered = new Set(registeredDefinitionKeys());
    const phantom = declared.filter((key) => !UNIVERSAL_KEYS.has(key) && !registered.has(key));

    expect(phantom).toEqual([]);
  });

  it('every declared ConditionField-family key is consumed', () => {
    const declaredBase = parseInterfaceKeys('BaseConditionField');
    const consumedBase = new Set(CONSUMED_NESTED_KEYS.BaseConditionField);
    expect(declaredBase.filter((key) => !consumedBase.has(key))).toEqual([]);

    for (const variant of [
      'ConditionTextField',
      'ConditionNumberField',
      'ConditionDateField',
      'ConditionTimeField',
      'ConditionDateTimeField',
      'ConditionSelectField',
      'ConditionBooleanField',
      'ConditionCustomField',
      'ConditionFieldGroup',
    ]) {
      const declared = parseInterfaceKeys(variant);
      const consumed = new Set(CONSUMED_NESTED_KEYS[variant]);
      expect(declared.filter((key) => !consumed.has(key))).toEqual([]);
    }
  });

  it('every declared ConditionCustomOperator/ConditionOperatorOverrides/ConditionFormulaConfig key is consumed or documented-future', () => {
    for (const iface of [
      'ConditionCustomOperator',
      'ConditionOperatorOverrides',
      'ConditionFormulaConfig',
    ]) {
      const declared = parseInterfaceKeys(iface);
      const consumed = new Set(CONSUMED_NESTED_KEYS[iface] ?? []);
      const future = new Set(DOCUMENTED_FUTURE_KEYS[iface] ?? []);
      expect(declared.filter((key) => !consumed.has(key) && !future.has(key))).toEqual([]);
    }
  });

  it('full-props schema renders without crashing (registered-prop coverage fixture)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
      formStateProbeRenderer,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/condition-builder/contract-honesty-fixture"
        schema={
          {
            type: 'form',
            data: {
              filterDefs: [{ name: 'status', label: 'Status', type: 'text' }],
              filters: {
                id: 'root',
                conjunction: 'and',
                children: [{ id: 'i1', left: { type: 'field', field: 'status' }, op: 'equal', right: 'a' }],
              },
            },
            body: [
              {
                type: 'condition-builder',
                name: 'filters',
                label: 'Filters',
                fields: '${filterDefs}',
                operators: {
                  labels: { equal: 'Is' },
                  operatorsByType: { text: ['equal', 'not_equal'] },
                  defaultOpByType: { text: 'equal' },
                },
                formulas: { enabled: true, formula: '${status}' },
                formulaForIf: { enabled: true },
                builderMode: 'full',
                embed: true,
                showAndOr: true,
                showNot: true,
                showIf: true,
                draggable: true,
                uniqueFields: true,
                maxDepth: 3,
                maxItemsPerGroup: 5,
                placeholder: 'No conditions',
                addConditionLabel: 'Add',
                addGroupLabel: 'Group',
                removeConditionLabel: 'Remove',
                removeGroupLabel: 'Remove group',
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Add' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Group' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
  });
});
