import { describe, it, expect } from 'vitest';
import { createRendererRegistry, registerRendererDefinitions } from '@nop-chaos/flux-core';
import { industrialRendererDefinitions } from './renderer-definitions.js';
import { registerScadaRenderers } from './index.js';

describe('industrialRendererDefinitions', () => {
  it('should export an array of RendererDefinition', () => {
    expect(Array.isArray(industrialRendererDefinitions)).toBe(true);
  });

  it('should contain exactly 1 definition (scada-canvas)', () => {
    expect(industrialRendererDefinitions).toHaveLength(1);
  });

  it('scada-canvas shell definition should have required fields', () => {
    const def = industrialRendererDefinitions[0];
    expect(def.type).toBe('scada-canvas');
    expect(def.displayName).toEqual(expect.any(String));
    expect(def.category).toEqual(expect.any(String));
    expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
    expect(def.defaultSchema).toEqual({ type: 'scada-canvas' });
    expect(def.component).toBeTypeOf('function');
  });

  it('scada-canvas shell should declare no fields yet (I10.2 fills them)', () => {
    const def = industrialRendererDefinitions[0];
    expect(def.fields).toEqual([]);
  });

  it('shell definition should register without conflicts via registerScadaRenderers', () => {
    const registry = createRendererRegistry();
    registerScadaRenderers(registry);
    expect(registry.has('scada-canvas')).toBe(true);
    expect(registry.list()).toHaveLength(1);
    const def = registry.get('scada-canvas');
    expect(def?.type).toBe('scada-canvas');
    expect(def?.sourcePackage).toBe('@nop-chaos/flux-renderers-industrial');
  });

  it('registerRendererDefinitions should return the registry', () => {
    const registry = createRendererRegistry();
    const result = registerRendererDefinitions(registry, industrialRendererDefinitions);
    expect(result).toBe(registry);
  });
});
