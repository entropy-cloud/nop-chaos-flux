// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardRenderer } from './card.js';
import { createMockRendererProps } from './test-support.js';
import type { CardSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="card"]') as HTMLElement;
}

describe('CardRenderer', () => {
  it('renders title, header, body, footer, and actions into their card regions', () => {
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'Card Title' },
      regions: {
        header: <span data-testid="hdr">Header</span>,
        body: <span data-testid="bdy">Body</span>,
        footer: <span data-testid="ftr">Footer</span>,
        actions: <button type="button" data-testid="act">Action</button>,
      },
    });
    const { container } = render(<CardRenderer {...props} />);
    const root = rootOf(container);
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-card');
    expect(root.querySelector('[data-slot="card-title"]')?.textContent).toBe('Card Title');
    expect(root.querySelector('[data-testid="hdr"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="bdy"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="ftr"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="act"]')).toBeTruthy();
  });

  it('renders an optional image as the first child', () => {
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'T', image: 'https://example.com/x.png' },
    });
    const { container } = render(<CardRenderer {...props} />);
    const img = rootOf(container).querySelector('[data-slot="card-image"]') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/x.png');
  });

  it('maps variant sm to ui Card size sm', () => {
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { variant: 'sm', title: 'T' },
    });
    const { container } = render(<CardRenderer {...props} />);
    expect(rootOf(container).getAttribute('data-size')).toBe('sm');
  });

  it('fires events.onClick when the card is clicked', () => {
    const onClick = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'T' },
      events: { onClick: onClick as never },
    });
    const { container } = render(<CardRenderer {...props} />);
    fireEvent.click(rootOf(container));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not attach an onClick handler when no onClick event is bound', () => {
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'T' },
    });
    const { container } = render(<CardRenderer {...props} />);
    expect(rootOf(container).onclick).toBeNull();
  });

  it('does not block child interaction when onClick is bound', () => {
    const onClick = vi.fn(async () => ({ ok: true }));
    const childClick = vi.fn();
    const props = createMockRendererProps<CardSchema>({
      schema: { type: 'card' },
      props: { title: 'T' },
      events: { onClick: onClick as never },
      regions: {
        body: (
          <button type="button" data-testid="child-btn" onClick={childClick}>
            Child
          </button>
        ),
      },
    });
    const { container, getByTestId } = render(<CardRenderer {...props} />);
    // child button is rendered inside the card body
    expect(rootOf(container).querySelector('[data-testid="child-btn"]')).toBeTruthy();
    fireEvent.click(getByTestId('child-btn'));
    // child interaction is not blocked
    expect(childClick).toHaveBeenCalledTimes(1);
  });
});
