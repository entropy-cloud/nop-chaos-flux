// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinkRenderer } from './link.js';
import { createMockRendererProps } from './test-support.js';
import type { LinkSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function rootOf(container: HTMLElement) {
  return container.querySelector('[data-slot="link"]') as HTMLAnchorElement;
}

// Dispatch a click and report whether the event ended up defaultPrevented.
// A document-level bubble listener runs after React's handler, so it observes
// the final preventDefault state decided by the bound action.
function dispatchClickAndReadPrevented(target: HTMLElement): boolean {
  let prevented = false;
  const listener = (event: MouseEvent) => {
    prevented = event.defaultPrevented;
  };
  document.addEventListener('click', listener);
  fireEvent.click(target);
  document.removeEventListener('click', listener);
  return prevented;
}

describe('LinkRenderer', () => {
  it('renders the label (value-or-region) as link text', () => {
    const props = createMockRendererProps<LinkSchema>({
      schema: { type: 'link' },
      props: { label: 'View details', href: '/x' },
    });
    const { container } = render(<LinkRenderer {...props} />);
    expect(rootOf(container).textContent).toBe('View details');
  });

  it('passes href/target/rel through to the anchor', () => {
    const props = createMockRendererProps<LinkSchema>({
      schema: { type: 'link' },
      props: { label: 'ext', href: 'https://safe.example/', target: '_blank' },
    });
    const { container } = render(<LinkRenderer {...props} />);
    const a = rootOf(container);
    expect(a.getAttribute('href')).toBe('https://safe.example/');
    expect(a.getAttribute('target')).toBe('_blank');
    // target=_blank auto-fills rel noopener noreferrer when not provided
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('respects an explicit rel override', () => {
    const props = createMockRendererProps<LinkSchema>({
      schema: { type: 'link' },
      props: { label: 'x', href: '/y', rel: 'help' },
    });
    expect(rootOf(render(<LinkRenderer {...props} />).container).getAttribute('rel')).toBe('help');
  });

  it('fires onClick and does not block navigation when the action does not preventDefault', () => {
    const onClick = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<LinkSchema>({
      schema: { type: 'link' },
      props: { label: 'go', href: '/dest' },
      events: { onClick: onClick as never },
    });
    const { container } = render(<LinkRenderer {...props} />);
    const prevented = dispatchClickAndReadPrevented(rootOf(container));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(prevented).toBe(false);
  });

  it('lets an action block navigation by calling preventDefault', () => {
    const onClick = vi.fn(async (event: { preventDefault: () => void }) => {
      event.preventDefault();
      return { ok: true };
    });
    const props = createMockRendererProps<LinkSchema>({
      schema: { type: 'link' },
      props: { label: 'go', href: '/dest' },
      events: { onClick: onClick as never },
    });
    const { container } = render(<LinkRenderer {...props} />);
    const prevented = dispatchClickAndReadPrevented(rootOf(container));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(prevented).toBe(true);
  });

  it('is disabled: drops href, blocks onClick, sets aria-disabled', () => {
    const onClick = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<LinkSchema>({
      schema: { type: 'link' },
      props: { label: 'go', href: '/dest', disabled: true },
      events: { onClick: onClick as never },
    });
    const { container } = render(<LinkRenderer {...props} />);
    const a = rootOf(container);
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(a);
    expect(onClick).not.toHaveBeenCalled();
  });
});
