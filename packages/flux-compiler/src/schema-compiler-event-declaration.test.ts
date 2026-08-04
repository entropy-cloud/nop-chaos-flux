import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';
import { getAcceptedSchemaKeys } from './schema-compiler/shape-validation-utils.js';

const closedInputRenderer: RendererDefinition = {
  type: 'closed-input',
  component: () => null,
  propSchema: { name: { type: 'string' } },
  fields: [{ key: 'name', kind: 'prop' }],
};

const openRenderer: RendererDefinition = {
  type: 'open-renderer',
  component: () => null,
  fields: [{ key: 'label', kind: 'prop' }],
};

const eventRenderer: RendererDefinition = {
  type: 'event-renderer',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

const arrayEditorRenderer: RendererDefinition = {
  type: 'array-editor',
  component: () => null,
};

describe('event field explicit declaration driven classification', () => {
  it('reports unknown-property for undeclared onXxx (misspelled event) on closedModel renderer', () => {
    const compiler = makeCompiler([closedInputRenderer]);

    const diagnostics = compiler.validate?.(
      {
        type: 'closed-input',
        name: 'quantity',
        onChnage: { action: 'setValue', args: { path: 'quantity', value: 1 } },
      },
      { validation: { strictMode: true } },
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/onChnage',
          severity: 'error',
        }),
      ]),
    );
  });

  it('reports unknown-property for undeclared onXxx with full nested schema path', () => {
    const compiler = makeCompiler([arrayEditorRenderer, closedInputRenderer]);

    const diagnostics = compiler.validate?.(
      {
        type: 'array-editor',
        columns: [
          {
            type: 'closed-input',
            name: 'quantity',
            onChnage: { action: 'setValue', args: { path: 'quantity', value: 1 } },
          },
        ],
      },
      { validation: { strictMode: true } },
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/columns/0/onChnage',
        }),
      ]),
    );
  });

  it('reports unknown-property for AMIS legacy onEvent on closedModel renderer', () => {
    const compiler = makeCompiler([closedInputRenderer]);

    const diagnostics = compiler.validate?.(
      {
        type: 'closed-input',
        name: 'quantity',
        onEvent: {
          change: {
            actions: [{ actionType: 'setValue', args: { value: 1 } }],
          },
        },
      },
      { validation: { strictMode: true } },
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/onEvent',
          severity: 'error',
        }),
      ]),
    );
  });

  it('accepts vocabulary event onChange without renderer declaration (open model, strictMode)', () => {
    const compiler = makeCompiler([openRenderer]);

    const diagnostics = compiler.validate?.(
      {
        type: 'open-renderer',
        label: 'Hello',
        onChange: { action: 'setValue', args: { path: 'label', value: '${event.value}' } },
      },
      { validation: { strictMode: true } },
    );

    expect(diagnostics).toEqual([]);
  });

  it('accepts vocabulary event onBlur/onFocus/onKeyDown/onKeyUp/onInput as event kind', () => {
    const compiler = makeCompiler([openRenderer]);

    const diagnostics = compiler.validate?.(
      {
        type: 'open-renderer',
        label: 'Hello',
        onBlur: { action: 'setValue', args: { path: 'blurred', value: true } },
        onFocus: { action: 'setValue', args: { path: 'focused', value: true } },
        onKeyDown: { action: 'setValue', args: { path: 'key', value: '${event.key}' } },
        onKeyUp: { action: 'setValue', args: { path: 'key', value: '${event.key}' } },
        onInput: { action: 'setValue', args: { path: 'value', value: '${event.value}' } },
      },
      { validation: { strictMode: true } },
    );

    expect(diagnostics).toEqual([]);
  });

  it('validates vocabulary event action shape (invalid value → invalid-action-shape with path)', () => {
    const compiler = makeCompiler([openRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'open-renderer',
      label: 'Hello',
      onChange: 'not-an-action',
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onChange',
        }),
      ]),
    );
  });

  it('validates renderer-declared event action shape (invalid action → invalid-action-shape)', () => {
    const compiler = makeCompiler([eventRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'event-renderer',
      onClick: { args: { path: 'x' } },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action objects require a non-empty action field.',
        }),
      ]),
    );
  });

  it('keeps explicit declared events outside the vocabulary legal (custom event names)', () => {
    const customEventRenderer: RendererDefinition = {
      type: 'custom-event-renderer',
      component: () => null,
      fields: [{ key: 'onCustomThing', kind: 'event' }],
    };
    const compiler = makeCompiler([customEventRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'custom-event-renderer',
      onCustomThing: { action: 'setValue', args: { path: 'x', value: 1 } },
    });

    expect(diagnostics).toEqual([]);
  });

  it('keeps META_FIELDS from unknown-property on closedModel renderer', () => {
    const compiler = makeCompiler([closedInputRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'closed-input',
      name: 'quantity',
      visible: true,
      disabled: false,
      testid: 'quantity-field',
    });

    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-property') ?? [];
    expect(unknowns).toHaveLength(0);
  });

  it('keeps LIFECYCLE_KEYS action-shape validation without unknown-property', () => {
    const compiler = makeCompiler([openRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'open-renderer',
      label: 'Hello',
      onMount: { action: 'setValue', args: { path: 'mounted', value: true } },
      onUnmount: { action: 'setValue', args: { path: 'unmounted', value: true } },
    });

    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-property') ?? [];
    expect(unknowns).toHaveLength(0);
    expect(diagnostics).toEqual([]);
  });

  it('keeps LIFECYCLE_KEYS invalid value flagged as invalid-action-shape', () => {
    const compiler = makeCompiler([openRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'open-renderer',
      label: 'Hello',
      onMount: 'bad-action',
    } as any);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onMount',
        }),
      ]),
    );
  });
});

describe('getAcceptedSchemaKeys vocabulary coverage', () => {
  it('includes COMMON_EVENT_FIELDS vocabulary keys even without renderer declaration', () => {
    const renderer: RendererDefinition = {
      type: 'bare',
      component: () => null,
    };

    const accepted = getAcceptedSchemaKeys(renderer);

    for (const key of ['onChange', 'onBlur', 'onFocus', 'onKeyDown', 'onKeyUp', 'onInput']) {
      expect(accepted.has(key)).toBe(true);
    }
  });

  it('keeps renderer-declared field keys and META_FIELDS in accepted keys', () => {
    const renderer: RendererDefinition = {
      type: 'declared',
      component: () => null,
      propSchema: { label: { type: 'string' } },
      fields: [
        { key: 'label', kind: 'prop' },
        { key: 'onRowClick', kind: 'event' },
      ],
    };

    const accepted = getAcceptedSchemaKeys(renderer);

    expect(accepted.has('label')).toBe(true);
    expect(accepted.has('onRowClick')).toBe(true);
    expect(accepted.has('visible')).toBe(true);
    expect(accepted.has('type')).toBe(true);
  });
});
