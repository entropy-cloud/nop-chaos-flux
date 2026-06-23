// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { contentRendererDefinitions } from './content-renderer-definitions.js';
import { createMockRendererProps } from './test-support.js';
import type { CardSchema, EmptySchema, ProgressSchema, SeparatorSchema, SpinnerSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

const TYPES = ['separator', 'spinner', 'progress', 'empty', 'card'] as const;

describe('contentRendererDefinitions', () => {
  it('declares 5 renderer definitions for the W1b feedback family', () => {
    expect(contentRendererDefinitions.map((d) => d.type).sort()).toEqual([...TYPES].sort());
  });

  it('every definition points at @nop-chaos/flux-renderers-content sourcePackage', () => {
    for (const def of contentRendererDefinitions) {
      expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-content');
    }
  });

  it('every definition has a component', () => {
    for (const def of contentRendererDefinitions) {
      expect(typeof def.component).toBe('function');
    }
  });

  it('card declares header/body/footer/actions regions + onClick event', () => {
    const card = contentRendererDefinitions.find((d) => d.type === 'card');
    const regionKeys = card?.fields?.filter((f) => f.kind === 'region').map((f) => f.key);
    expect(regionKeys).toEqual(['header', 'body', 'footer', 'actions']);
    expect(card?.fields?.find((f) => f.key === 'title')?.kind).toBe('value-or-region');
    expect(card?.fields?.find((f) => f.key === 'onClick')?.kind).toBe('event');
    expect(card?.category).toBe('layout');
  });

  it('empty declares title/description value-or-region + actions region', () => {
    const empty = contentRendererDefinitions.find((d) => d.type === 'empty');
    expect(empty?.fields?.find((f) => f.key === 'title')?.kind).toBe('value-or-region');
    expect(empty?.fields?.find((f) => f.key === 'description')?.kind).toBe('value-or-region');
    expect(empty?.fields?.find((f) => f.key === 'actions')?.kind).toBe('region');
  });

  it('progress declares value/max props + label value-or-region', () => {
    const progress = contentRendererDefinitions.find((d) => d.type === 'progress');
    expect(progress?.fields?.find((f) => f.key === 'value')?.kind).toBe('prop');
    expect(progress?.fields?.find((f) => f.key === 'max')?.kind).toBe('prop');
    expect(progress?.fields?.find((f) => f.key === 'label')?.kind).toBe('value-or-region');
  });

  it('separator component renders the nop-separator marker via its definition', () => {
    const separator = contentRendererDefinitions.find((d) => d.type === 'separator');
    const props = createMockRendererProps<SeparatorSchema>({ schema: { type: 'separator' } });
    const Comp = separator?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="separator"]')?.className).toContain(
      'nop-separator',
    );
  });

  it('spinner component renders via its definition', () => {
    const spinner = contentRendererDefinitions.find((d) => d.type === 'spinner');
    const props = createMockRendererProps<SpinnerSchema>({ schema: { type: 'spinner' } });
    const Comp = spinner?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="spinner"]')).toBeTruthy();
  });

  it('progress component renders via its definition', () => {
    const progress = contentRendererDefinitions.find((d) => d.type === 'progress');
    const props = createMockRendererProps<ProgressSchema>({
      schema: { type: 'progress' },
      props: { value: 40 },
    });
    const Comp = progress?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="progress"]')).toBeTruthy();
  });

  it('empty component renders via its definition', () => {
    const empty = contentRendererDefinitions.find((d) => d.type === 'empty');
    const props = createMockRendererProps<EmptySchema>({ schema: { type: 'empty' } });
    const Comp = empty?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    expect(view.container.querySelector('[data-slot="empty"]')).toBeTruthy();
  });

  it('card component renders all four regions via its definition', () => {
    const card = contentRendererDefinitions.find((d) => d.type === 'card');
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'T' },
      regions: {
        header: <i data-testid="h" />,
        body: <i data-testid="b" />,
        footer: <i data-testid="f" />,
        actions: <i data-testid="a" />,
      },
    });
    const Comp = card?.component as React.ComponentType<typeof props>;
    const view = render(<Comp {...props} />);
    const root = view.container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.querySelector('[data-testid="h"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="b"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="f"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="a"]')).toBeTruthy();
  });
});
