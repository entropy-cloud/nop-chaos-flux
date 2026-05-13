import { describe, expect, it } from 'vitest';
import { basicRendererDefinitions } from '../index.js';

describe('basic renderer static contracts', () => {
  it('declares button as an instance renderer with prop and event contracts', () => {
    const button = basicRendererDefinitions.find((definition) => definition.type === 'button');

    expect(button?.rendererClass).toBe('instance-renderer');
    expect(button?.rendererTraits).toContain('trigger');
    expect(button?.propContracts?.label?.shape.kind).toBe('string');
    expect(button?.eventContracts?.onClick?.displayName).toBe('Click');
    expect(button?.hostContract).toBeUndefined();
  });

  it('declares tabs finite option prop contracts', () => {
    const tabs = basicRendererDefinitions.find((definition) => definition.type === 'tabs');

    expect(tabs?.propContracts?.variant?.shape.kind).toBe('union');
    expect(tabs?.propContracts?.orientation?.shape.kind).toBe('union');
  });
});
