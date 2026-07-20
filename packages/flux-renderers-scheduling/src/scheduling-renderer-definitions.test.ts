import { describe, it, expect } from 'vitest';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';

describe('schedulingRendererDefinitions', () => {
  it('should export an array of RendererDefinition', () => {
    expect(Array.isArray(schedulingRendererDefinitions)).toBe(true);
  });

  it('should contain exactly 4 definitions (gantt, kanban, calendar, barcode-input)', () => {
    expect(schedulingRendererDefinitions).toHaveLength(4);
  });

  it('each definition should have required fields', () => {
    for (const def of schedulingRendererDefinitions) {
      expect(def).toHaveProperty('type');
      expect(def).toHaveProperty('displayName');
      expect(def).toHaveProperty('category');
      expect(def).toHaveProperty('sourcePackage');
      expect(def).toHaveProperty('defaultSchema');
      expect(def.type).toEqual(expect.any(String));
      expect(def.displayName).toEqual(expect.any(String));
      expect(def.category).toEqual(expect.any(String));
      expect(def.sourcePackage).toEqual(expect.any(String));
    }
  });

  it('definitions should have the correct types', () => {
    const types = schedulingRendererDefinitions.map((d) => d.type);
    expect(types).toContain('gantt');
    expect(types).toContain('kanban');
    expect(types).toContain('calendar');
    expect(types).toContain('barcode-input');
  });

  it('each definition should have sourcePackage set to @nop-chaos/flux-renderers-scheduling', () => {
    for (const def of schedulingRendererDefinitions) {
      expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-scheduling');
    }
  });
});
