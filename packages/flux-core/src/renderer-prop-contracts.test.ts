import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RendererFieldContract } from './index.js';
import {
  resolveRendererEventContracts,
  resolveRendererPropContracts,
} from './renderer-prop-contracts.js';
import type { RegisteredRendererDefinition } from './index.js';

function makeRenderer(definition: Record<string, unknown>): RegisteredRendererDefinition {
  return definition as unknown as RegisteredRendererDefinition;
}

describe('resolveRendererPropContracts (RM-4 fields-only)', () => {
  it('maps exactly the prop fields that carry an inline contract', () => {
    const renderer = makeRenderer({
      type: 'legacy',
      component: () => null,
      fields: [
        { key: 'level', kind: 'prop', contract: { shape: { kind: 'number' }, displayName: 'Level' } },
        {
          key: 'title',
          kind: 'prop',
          contract: { shape: { kind: 'string' }, displayName: 'Title', editorType: 'text' },
        },
        { key: 'body', kind: 'region' },
      ],
    });

    expect(resolveRendererPropContracts(renderer)).toEqual({
      level: { shape: { kind: 'number' }, displayName: 'Level' },
      title: { shape: { kind: 'string' }, displayName: 'Title', editorType: 'text' },
    });
  });

  it('keeps the first fields occurrence when the same key is declared twice', () => {
    const renderer = makeRenderer({
      type: 'both',
      component: () => null,
      fields: [
        { key: 'level', kind: 'prop', contract: { shape: { kind: 'number' }, displayName: 'Record Level' } },
        { key: 'level', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Field Level' } },
      ],
    });

    const resolved = resolveRendererPropContracts(renderer);
    expect(resolved.level).toEqual({ shape: { kind: 'number' }, displayName: 'Record Level' });
  });

  it('surfaces fields-only inline contracts (kind prop) as prop contracts', () => {
    const contract: RendererFieldContract = {
      shape: { kind: 'string' },
      displayName: 'Heading',
      editorType: 'text',
      required: true,
    };
    const renderer = makeRenderer({
      type: 'merged',
      component: () => null,
      fields: [
        { key: 'heading', kind: 'prop', contract },
        { key: 'body', kind: 'region', contract },
        { key: 'title', kind: 'event' },
      ],
    });

    const resolved = resolveRendererPropContracts(renderer);
    expect(resolved.heading).toEqual({
      shape: { kind: 'string' },
      displayName: 'Heading',
      description: undefined,
      editorType: 'text',
      defaultValue: undefined,
      required: true,
    });
    // non-prop kinds never enter the map even when they carry a contract
    expect(resolved.body).toBeUndefined();
    expect(resolved.title).toBeUndefined();
  });

  it('defaults the display name to the field key when the contract omits it', () => {
    const renderer = makeRenderer({
      type: 'anon',
      component: () => null,
      fields: [{ key: 'level', kind: 'prop', contract: { shape: { kind: 'number' } } }],
    });

    expect(resolveRendererPropContracts(renderer).level?.displayName).toBe('level');
  });

  it('keeps the helper output structurally assignable to RendererPropContract records', () => {
    expectTypeOf(resolveRendererPropContracts).returns.toMatchTypeOf<
      Readonly<Record<string, { shape: unknown; displayName: string }>>
    >();
  });
});

describe('resolveRendererEventContracts (RM-5 single source)', () => {
  it('surfaces fields-only event contracts as event contracts', () => {
    const renderer = makeRenderer({
      type: 'evt',
      component: () => null,
      fields: [
        {
          key: 'onClick',
          kind: 'event',
          contract: {
            displayName: 'Click',
            payload: { kind: 'object', fields: { row: { kind: 'unknown' } } },
          },
        },
        { key: 'onBlur', kind: 'event' },
      ],
    });

    const events = resolveRendererEventContracts(renderer);
    expect(events.onClick).toEqual({
      displayName: 'Click',
      description: undefined,
      payload: { kind: 'object', fields: { row: { kind: 'unknown' } } },
    });
    // events without an inline contract carry no authoring metadata
    expect(events.onBlur).toBeUndefined();
  });

  it('defaults the display name to the field key', () => {
    const renderer = makeRenderer({
      type: 'evt2',
      component: () => null,
      fields: [{ key: 'onRowClick', kind: 'event', contract: { payload: { kind: 'unknown' } } }],
    });

    expect(resolveRendererEventContracts(renderer).onRowClick?.displayName).toBe('onRowClick');
  });
});
