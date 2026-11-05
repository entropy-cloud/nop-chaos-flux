import { describe, expect, it } from 'vitest';
import { toCompiledRendererContract } from './compiled-renderer-contract.js';
import type { BaseSchema } from './schema.js';

interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
}

function buttonDefinition() {
  return {
    type: 'button' as const,
    component: function ButtonRenderer() {
      return null;
    },
    scopePolicy: 'inherit' as const,
    actionScopePolicy: 'inherit' as const,
    componentRegistryPolicy: 'inherit' as const,
    fields: [{ name: 'label', kind: 'static' }] as never,
    validationDefaults: { validateWhenHidden: false } as never,
    compilation: { staticCapable: true } as never,
    wrap: true,
    frameRootTag: 'label' as const,
    frameWrap: 'label' as const,
    staticCapable: true,
  };
}

describe('toCompiledRendererContract', () => {
  it('materializes exactly the contract key set — no more, no fewer', () => {
    const contract = toCompiledRendererContract<ButtonSchema>(buttonDefinition());
    expect(Object.keys(contract).sort()).toEqual(
      [
        'actionScopePolicy',
        'compilation',
        'component',
        'componentRegistryPolicy',
        'fields',
        'frameRootTag',
        'frameWrap',
        'scopePolicy',
        'staticCapable',
        'type',
        'validation',
        'validationDefaults',
        'wrap',
      ].sort(),
    );
  });

  it('derives every Pick channel plus type/component/validation onto the runtime object', () => {
    const definition = buttonDefinition();
    const contract = toCompiledRendererContract<ButtonSchema>(definition);
    expect(contract.type).toBe('button');
    expect(contract.component).toBe(definition.component);
    expect(contract.scopePolicy).toBe('inherit');
    expect(contract.actionScopePolicy).toBe('inherit');
    expect(contract.componentRegistryPolicy).toBe('inherit');
    expect(contract.fields).toBe(definition.fields);
    expect(contract.validationDefaults).toBe(definition.validationDefaults);
    expect(contract.compilation).toBe(definition.compilation);
    expect(contract.wrap).toBe(true);
    expect(contract.frameRootTag).toBe('label');
    expect(contract.frameWrap).toBe('label');
    expect(contract.staticCapable).toBe(true);
  });

  it('copies channels by reference (no cloning — compiler relies on identity)', () => {
    const definition = buttonDefinition();
    const contract = toCompiledRendererContract<ButtonSchema>(definition);
    expect(contract.fields).toBe(definition.fields);
    expect(contract.compilation).toBe(definition.compilation);
    expect(contract.component).toBe(definition.component);
  });

  it('an undefined validation channel stays undefined on the contract face', () => {
    const definition = buttonDefinition();
    const contract = toCompiledRendererContract<ButtonSchema>(definition);
    expect('validation' in contract).toBe(true);
    expect(contract.validation).toBeUndefined();
  });

  it('a provided validation contributor is carried through verbatim', () => {
    const contributor = { validate: () => [] } as never;
    const definition = { ...buttonDefinition(), validation: contributor };
    const contract = toCompiledRendererContract<ButtonSchema>(definition);
    expect(contract.validation).toBe(contributor);
  });

  it('optional channels left undefined stay undefined on the contract (no defaults are invented)', () => {
    const contract = toCompiledRendererContract<ButtonSchema>({
      type: 'button',
      component: null,
    });
    expect(contract.scopePolicy).toBeUndefined();
    expect(contract.wrap).toBeUndefined();
    expect(contract.frameRootTag).toBeUndefined();
    expect(contract.staticCapable).toBeUndefined();
    expect(contract.type).toBe('button');
  });

  it('does not leak non-contract shape members (rendererClass / hostContract stay off the face)', () => {
    const definition = {
      ...buttonDefinition(),
      rendererClass: 'widget' as never,
      hostContract: { actions: {} } as never,
      sourcePackage: 'test' as never,
    };
    const contract = toCompiledRendererContract<ButtonSchema>(definition);
    expect('rendererClass' in contract).toBe(false);
    expect('hostContract' in contract).toBe(false);
    expect('sourcePackage' in contract).toBe(false);
  });
});
