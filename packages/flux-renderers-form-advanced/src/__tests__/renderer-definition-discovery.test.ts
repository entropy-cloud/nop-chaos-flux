import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from '../index.js';

describe('form-advanced renderer discovery metadata', () => {
  it('publishes the migrated source package for exported renderer definitions', () => {
    const migratedTypes = [
      'input-tree',
      'tree-select',
      'tag-list',
      'key-value',
      'array-editor',
      'condition-builder',
      'object-field',
      'array-field',
      'variant-field',
      'detail-field',
      'detail-view',
    ];

    for (const type of migratedTypes) {
      const definition = formAdvancedRendererDefinitions.find((item) => item.type === type);
      expect(definition?.sourcePackage, `${type} should publish migrated sourcePackage`).toBe(
        '@nop-chaos/flux-renderers-form-advanced',
      );
    }
  });
});
