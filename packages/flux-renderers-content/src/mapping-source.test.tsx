import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MappingRenderer } from './mapping.js';
import { createMockRendererProps } from './test-support.js';
import type { MappingSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

describe('MappingRenderer — MP2 source expression', () => {
  it('uses static map when source is absent', () => {
    const props = createMockRendererProps<MappingSchema>({
      schema: { type: 'mapping' },
      props: { value: 'a', map: { a: 'Alpha', b: 'Beta' } },
    });
    const { container } = render(<MappingRenderer {...props} />);
    const item = container.querySelector('[data-slot="mapping-item"]');
    expect(item?.textContent).toBe('Alpha');
  });

  it('merges source entries into static map with source winning on conflict', () => {
    const props = createMockRendererProps<MappingSchema>({
      schema: { type: 'mapping' },
      props: {
        value: 'a',
        map: { a: 'Static A', b: 'Static B' },
        source: { a: 'Source A', c: 'Source C' },
      },
    });
    const { container } = render(<MappingRenderer {...props} />);
    const item = container.querySelector('[data-slot="mapping-item"]');
    expect(item?.textContent).toBe('Source A');
  });

  it('resolves value from source-only entry', () => {
    const props = createMockRendererProps<MappingSchema>({
      schema: { type: 'mapping' },
      props: {
        value: 'c',
        map: { a: 'Alpha' },
        source: { c: 'Charlie' },
      },
    });
    const { container } = render(<MappingRenderer {...props} />);
    const item = container.querySelector('[data-slot="mapping-item"]');
    expect(item?.textContent).toBe('Charlie');
  });

  it('marks data-source attribute when source is loaded', () => {
    const props = createMockRendererProps<MappingSchema>({
      schema: { type: 'mapping' },
      props: {
        value: 'a',
        map: { a: 'Alpha' },
        source: { b: 'Beta' },
      },
    });
    const { container } = render(<MappingRenderer {...props} />);
    const root = container.querySelector('[data-slot="mapping-root"]');
    expect(root?.getAttribute('data-source')).toBe('loaded');
  });

  it('handles string source as passthrough (no merge)', () => {
    const props = createMockRendererProps<MappingSchema>({
      schema: { type: 'mapping' },
      props: {
        value: 'a',
        map: { a: 'Alpha' },
        source: 'not-an-object',
      },
    });
    const { container } = render(<MappingRenderer {...props} />);
    const item = container.querySelector('[data-slot="mapping-item"]');
    expect(item?.textContent).toBe('Alpha');
  });
});
