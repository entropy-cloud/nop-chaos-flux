import { describe, expect, it } from 'vitest';
import type { RendererDefinition, RendererPlugin } from '@nop-chaos/flux-core';
import {
  isNamespacedSchemaKey,
  applyWrapComponentPlugins,
} from './schema-compiler/shape-validation.js';

describe('isNamespacedSchemaKey', () => {
  it('returns true for namespaced keys', () => {
    expect(isNamespacedSchemaKey('xui:imports')).toBe(true);
    expect(isNamespacedSchemaKey('acme:layout')).toBe(true);
  });

  it('returns false for plain keys', () => {
    expect(isNamespacedSchemaKey('type')).toBe(false);
    expect(isNamespacedSchemaKey('label')).toBe(false);
  });

  it('returns false for key starting with colon', () => {
    expect(isNamespacedSchemaKey(':foo')).toBe(false);
  });
});

describe('applyWrapComponentPlugins', () => {
  it('returns renderer unchanged when no plugins', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    expect(applyWrapComponentPlugins(renderer, undefined)).toBe(renderer);
  });

  it('returns renderer unchanged when plugins is empty', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    expect(applyWrapComponentPlugins(renderer, [])).toBe(renderer);
  });

  it('applies wrapComponent from plugins', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin: RendererPlugin = {
      name: 'test-plugin',
      wrapComponent(def) {
        return { ...def, staticCapable: true };
      },
    };

    const result = applyWrapComponentPlugins(renderer, [plugin]);
    expect(result.staticCapable).toBe(true);
  });

  it('chains multiple plugins', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin1: RendererPlugin = {
      name: 'p1',
      wrapComponent(def) {
        return { ...def, staticCapable: true };
      },
    };
    const plugin2: RendererPlugin = {
      name: 'p2',
      wrapComponent(def) {
        return { ...def, displayName: 'Wrapped' };
      },
    };

    const result = applyWrapComponentPlugins(renderer, [plugin1, plugin2]);
    expect(result.staticCapable).toBe(true);
    expect(result.displayName).toBe('Wrapped');
  });

  it('skips plugins without wrapComponent', () => {
    const renderer: RendererDefinition = { type: 'text', component: () => null };
    const plugin: RendererPlugin = {
      name: 'noop',
      beforeCompile(schema) {
        return schema;
      },
    };

    expect(applyWrapComponentPlugins(renderer, [plugin])).toBe(renderer);
  });
});
