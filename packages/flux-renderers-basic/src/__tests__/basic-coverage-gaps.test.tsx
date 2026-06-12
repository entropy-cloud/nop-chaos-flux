import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '../index.js';
import {
  buildSlotBindings,
  createStructuralRepeatedTemplateId,
  renderStructuralLoop,
  resolveLoopBindings,
} from '../structural-loop.js';
import { classNames, resolveDirection } from '../utils.js';
import { resolveGap } from '@nop-chaos/flux-react';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('basic renderer coverage gaps', () => {
  it('covers layout utility helpers across token, numeric, and css gap inputs', () => {
    expect(classNames('alpha', undefined, false, 'beta')).toBe('alpha beta');
    expect(resolveDirection('column')).toBe('flex-col');
    expect(resolveDirection('row')).toBe('flex-row');
    expect(resolveDirection()).toBeUndefined();
    expect(resolveGap(undefined)).toEqual({});
    expect(resolveGap(12)).toEqual({ style: { gap: '12px' } });
    expect(resolveGap('sm')).toEqual({ className: 'gap-2' });
    expect(resolveGap('1rem')).toEqual({ style: { gap: '1rem' } });
  });

  it('renders badge variants for all supported levels', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{
          type: 'page',
          body: [
            { type: 'badge', text: 'Info' },
            { type: 'badge', text: 'Success', level: 'success' },
            { type: 'badge', text: 'Warning', level: 'warning' },
            {
              type: 'badge',
              text: 'Danger',
              level: 'danger',
              testid: 'danger-badge',
              cid: 'danger-cid',
            },
            { type: 'badge', text: undefined, testid: 'empty-badge' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Info').className).toContain('bg-secondary');
    expect(screen.getByText('Success').className).toContain('bg-emerald');
    expect(screen.getByText('Warning').className).toContain('bg-amber');
    expect(screen.getByTestId('danger-badge').className).toContain('bg-destructive');
    expect(screen.getByTestId('empty-badge').textContent).toBe('');

    cleanup();
  });

  it('renders badge with text and level props, ignoring invalid label/variant props', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/badge-props"
        schema={{
          type: 'page',
          body: [
            { type: 'badge', text: 'Correct', level: 'success', testid: 'badge-correct' },
            { type: 'badge', label: 'WrongProps', variant: 'default', testid: 'badge-wrong' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const correctBadge = screen.getByTestId('badge-correct');
    expect(correctBadge.textContent).toBe('Correct');
    expect(correctBadge.className).toContain('bg-emerald');

    const wrongBadge = screen.getByTestId('badge-wrong');
    expect(wrongBadge.textContent).toBe('');
    expect(wrongBadge.className).not.toContain('bg-emerald');

    cleanup();
  });

  it('renders fragment as empty when no body template is provided', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{ type: 'fragment' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(container.textContent).toBe('');
    cleanup();
  });

  it('renders flex branches for supported alignment, justification, and gap modes', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{
          type: 'flex',
          direction: 'column',
          wrap: true,
          align: 'center',
          justify: 'between',
          gap: 'sm',
          className: 'custom-flex',
          testid: 'flex-root',
          cid: 'flex-cid',
          body: [{ type: 'text', text: 'Body content' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    let flexRoot = screen.getByTestId('flex-root');
    expect(flexRoot.className).toContain('nop-flex');
    expect(flexRoot.className).toContain('flex-col');
    expect(flexRoot.className).toContain('flex-wrap');
    expect(flexRoot.className).toContain('items-center');
    expect(flexRoot.className).toContain('justify-between');
    expect(flexRoot.className).toContain('gap-2');
    expect(flexRoot.className).toContain('custom-flex');
    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{
          type: 'flex',
          align: 'start',
          justify: 'start',
          items: [{ type: 'text', text: 'Items fallback' }],
          testid: 'flex-root',
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    flexRoot = screen.getByTestId('flex-root');
    expect(flexRoot.className).toContain('items-start');
    expect(flexRoot.className).toContain('justify-start');
    expect(flexRoot.className).not.toContain('flex-row');
    expect(flexRoot.className).not.toContain('flex-col');
    expect(flexRoot.textContent).toContain('Items fallback');

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{
          type: 'flex',
          align: 'end',
          justify: 'end',
          gap: 10,
          testid: 'flex-root',
          body: [{ type: 'text', text: 'Numeric gap' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    flexRoot = screen.getByTestId('flex-root');
    expect(flexRoot.className).toContain('items-end');
    expect(flexRoot.className).toContain('justify-end');
    expect(flexRoot.style.gap).toBe('10px');

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{
          type: 'flex',
          align: 'stretch',
          justify: 'around',
          gap: '1rem',
          testid: 'flex-root',
          body: [{ type: 'text', text: 'Css gap' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    flexRoot = screen.getByTestId('flex-root');
    expect(flexRoot.className).toContain('items-stretch');
    expect(flexRoot.className).toContain('justify-around');
    expect(flexRoot.style.gap).toBe('1rem');

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{
          type: 'flex',
          direction: 'diagonal' as 'row',
          align: 'baseline' as 'start',
          justify: 'evenly' as 'start',
          testid: 'flex-root',
          items: [{ type: 'text', text: 'Invalid values fallback' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    flexRoot = screen.getByTestId('flex-root');
    expect(flexRoot.className).not.toContain('flex-row');
    expect(flexRoot.className).not.toContain('flex-col');
    expect(flexRoot.className).not.toContain('items-center');
    expect(flexRoot.className).not.toContain('justify-center');
    cleanup();
  });

  it('formats scope debug values with JSON-like undefined semantics and explicit special encodings', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const circular: Record<string, unknown> = {
      missing: undefined,
      fn: () => 'value',
      count: 12n,
      problem: new Error('boom'),
      list: [1, undefined, () => 'value'],
    };
    circular.self = circular;

    render(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{ type: 'page', body: [{ type: 'scope-debug', defaultExpand: true }] }}
        data={circular}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Scope Debug')).toBeTruthy();
    const debugText = document.querySelector('[data-slot="scope-debug-json"]')?.textContent ?? '';
    expect(debugText).not.toContain('"missing"');
    expect(debugText).toContain('"fn": "@function"');
    expect(debugText).toContain('"count": "@bigint:12"');
    expect(debugText).toContain('"message": "boom"');
    expect(debugText).toContain('"self": "@circular"');
    expect(debugText).toContain('"list": [\n    1,\n    null,\n    "@function"\n  ]');
    cleanup();
  });

  it('covers structural loop helpers for empty, capped, and keyed loop states', () => {
    expect(
      resolveLoopBindings({ itemName: ' user ', indexName: ' idx ', keyName: ' key ' }),
    ).toEqual({
      itemName: 'user',
      indexName: 'idx',
      keyName: 'key',
    });
    expect(resolveLoopBindings({ itemName: ' ', indexName: '', keyName: ' ' })).toEqual({
      itemName: 'item',
      indexName: 'index',
      keyName: undefined,
    });
    expect(
      buildSlotBindings({
        item: { id: 'u1' },
        index: 2,
        itemKey: 'item-key',
        bindings: { itemName: 'row', indexName: 'rowIndex', keyName: 'rowKey' },
        itemData: { extra: 'value' },
      }),
    ).toEqual({
      row: { id: 'u1' },
      rowIndex: 2,
      rowKey: 'item-key',
      extra: 'value',
    });
    expect(createStructuralRepeatedTemplateId('owner')).toBe('loop:owner');

    expect(
      renderStructuralLoop({
        items: [{ id: 'u1' }],
        hasBody: true,
        bindings: { itemName: 'item', indexName: 'index' },
        ownerId: 'owner',
        repeatedTemplateId: 'loop:owner',
        maxDepth: 1,
        currentDepth: 1,
        renderItem: () => 'unreachable',
      }),
    ).toBeNull();

    expect(
      renderStructuralLoop({
        items: [],
        hasBody: true,
        hasEmpty: false,
        bindings: { itemName: 'item', indexName: 'index' },
        ownerId: 'owner',
        repeatedTemplateId: 'loop:owner',
        renderItem: () => 'unreachable',
      }),
    ).toBeNull();

    expect(
      renderStructuralLoop({
        items: [],
        hasBody: true,
        hasEmpty: true,
        bindings: { itemName: 'item', indexName: 'index' },
        ownerId: 'owner',
        repeatedTemplateId: 'loop:owner',
        renderItem: () => 'unreachable',
        renderEmpty: () => 'empty-state',
      }),
    ).toBe('empty-state');

    expect(
      renderStructuralLoop({
        items: [{ id: 'u1' }],
        hasBody: false,
        bindings: { itemName: 'item', indexName: 'index' },
        ownerId: 'owner',
        repeatedTemplateId: 'loop:owner',
        renderItem: () => 'unreachable',
      }),
    ).toBeNull();

    const keyedResults: Array<{
      itemKey: string;
      depth: number;
      instanceKey: string;
      slotBindings: Record<string, unknown>;
    }> = [];
    renderStructuralLoop({
      items: [
        { slug: 'from-path' },
        { slug: '', id: 'fallback-id' },
        { id: 'record-id' },
        { key: 'record-key' },
        { name: 'record-name' },
        { other: true },
      ],
      hasBody: true,
      bindings: { itemName: 'item', indexName: 'index', keyName: 'loopKey' },
      ownerId: 'owner',
      parentInstancePath: [{ repeatedTemplateId: 'parent', instanceKey: 'p1' }],
      repeatedTemplateId: 'loop:owner',
      keyBy: '${item.slug}',
      itemData: { injected: 'value' },
      renderItem: ({ itemKey, slotBindings, instancePath, depth }) => {
        keyedResults.push({
          itemKey,
          depth,
          instanceKey: instancePath[instancePath.length - 1]?.instanceKey ?? '',
          slotBindings,
        });
        return null;
      },
    });

    expect(keyedResults.map((entry) => entry.itemKey)).toEqual([
      'from-path',
      'fallback-id',
      'record-id',
      'record-key',
      'record-name',
      '5',
    ]);
    expect(keyedResults.every((entry) => entry.depth === 1)).toBe(true);
    expect(keyedResults.map((entry) => entry.instanceKey)).toEqual([
      'from-path',
      'fallback-id',
      'record-id',
      'record-key',
      'record-name',
      '5',
    ]);
    expect(keyedResults[0]?.slotBindings).toMatchObject({
      item: { slug: 'from-path' },
      index: 0,
      loopKey: 'from-path',
      injected: 'value',
    });

    const primitiveResults: string[] = [];
    renderStructuralLoop({
      items: ['plain', 3, true],
      hasBody: true,
      bindings: { itemName: 'item', indexName: 'index' },
      ownerId: 'owner',
      repeatedTemplateId: 'loop:owner',
      keyBy: 'item',
      renderItem: ({ itemKey }) => {
        primitiveResults.push(itemKey);
        return null;
      },
    });
    expect(primitiveResults).toEqual(['plain', '3', 'true']);
  });

  it('registers basic renderers through the shared registry helper', () => {
    const registered: Array<{ type: string }> = [];
    registerBasicRenderers({
      register(definition: RendererDefinition) {
        registered.push({ type: definition.type });
        return () => undefined;
      },
    } as never);

    expect(registered.some((entry) => entry.type === 'page')).toBe(true);
    expect(registered.some((entry) => entry.type === 'tabs')).toBe(true);
  });

  it('covers icon fallback when the icon prop is absent', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/coverage-gaps"
        schema={{ type: 'page', body: [{ type: 'icon', testid: 'empty-icon' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const icon = screen.getByTestId('empty-icon');
    expect(icon.getAttribute('data-icon')).toBeNull();
    cleanup();
  });
});
