import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createMockRendererProps } from '../../test-support.js';
import { AiWelcomeRenderer } from '../ai-welcome.js';
import type { AiWelcomeSchema } from '../../schemas.js';

// Cast registered renderers (which return `RendererRenderOutput = unknown`)
// to a JSX-compatible component type for direct testing.
const Welcome = AiWelcomeRenderer as unknown as ComponentType<Record<string, unknown>>;

afterEach(() => {
  cleanup();
});

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiWelcomeSchema>>>) {
  return createMockRendererProps<AiWelcomeSchema>({
    schema: { type: 'ai-welcome' },
    ...overrides,
  });
}

describe('ai-welcome — content rendering (C8.3)', () => {
  it('renders title / description / icon with the nop-ai-welcome marker', () => {
    const props = makeProps({
      props: { type: 'ai-welcome', title: 'Welcome', description: 'Ask me anything.', icon: '✨' },
    });
    const { container } = render(<Welcome {...props} />);
    const root = container.querySelector('.nop-ai-welcome')!;
    expect(root.getAttribute('data-slot')).toBe('ai-welcome');
    expect(container.querySelector('[data-slot="ai-welcome-title"]')?.textContent).toBe('Welcome');
    expect(container.querySelector('[data-slot="ai-welcome-description"]')?.textContent).toBe('Ask me anything.');
    expect(container.querySelector('[data-slot="ai-welcome-icon"]')?.textContent).toBe('✨');
    expect(container.querySelector('[data-slot="ai-welcome-icon"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders partial content (icon only) without crashing', () => {
    const props = makeProps({ props: { type: 'ai-welcome', icon: 'bot' } });
    const { container } = render(<Welcome {...props} />);
    expect(container.querySelector('[data-slot="ai-welcome-icon"]')?.textContent).toBe('bot');
    expect(container.querySelector('[data-slot="ai-welcome-title"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-welcome-description"]')).toBeNull();
  });

  it('renders an empty marker root when no content is provided', () => {
    const props = makeProps({ props: { type: 'ai-welcome' } });
    const { container } = render(<Welcome {...props} />);
    const root = container.querySelector('.nop-ai-welcome')!;
    expect(root.getAttribute('data-align')).toBe('center');
    expect(container.querySelector('[data-slot="ai-welcome-title"]')).toBeNull();
  });
});

describe('ai-welcome — align variants (C8.3)', () => {
  it('maps left/center/right to data-align and the matching alignment classes', () => {
    for (const align of ['left', 'center', 'right'] as const) {
      const props = makeProps({ props: { type: 'ai-welcome', align } });
      const { container } = render(<Welcome {...props} />);
      const root = container.querySelector('.nop-ai-welcome')!;
      expect(root.getAttribute('data-align')).toBe(align);
      if (align === 'left') expect(root.className).toContain('text-left');
      if (align === 'right') expect(root.className).toContain('text-right');
      if (align === 'center') expect(root.className).toContain('text-center');
      cleanup();
    }
  });
});

describe('ai-welcome — footer region (C8.3)', () => {
  it('renders the footer region content inside the footer slot', () => {
    const footerNode = <div data-testid="welcome-footer-child">CTA button</div>;
    const props = makeProps({
      props: { type: 'ai-welcome', title: 'Welcome' },
      regions: { footer: { key: 'footer', templateNode: null, render: () => footerNode } },
    });
    const { container } = render(<Welcome {...props} />);
    const footer = container.querySelector('[data-slot="ai-welcome-footer"]');
    expect(footer).not.toBeNull();
    expect(footer?.querySelector('[data-testid="welcome-footer-child"]')?.textContent).toBe('CTA button');
  });

  it('omits the footer slot when no footer region is provided', () => {
    const props = makeProps({ props: { type: 'ai-welcome' } });
    const { container } = render(<Welcome {...props} />);
    expect(container.querySelector('[data-slot="ai-welcome-footer"]')).toBeNull();
  });
});

describe('ai-welcome — DOM contract (C8.3)', () => {
  it('propagates data-cid / data-testid onto the root', () => {
    const props = makeProps({
      props: { type: 'ai-welcome' },
      meta: { cid: 7, testid: 'wl-1' } as never,
    });
    const { container } = render(<Welcome {...props} />);
    const root = container.querySelector('.nop-ai-welcome')!;
    expect(root.getAttribute('data-cid')).toBe('7');
    expect(root.getAttribute('data-testid')).toBe('wl-1');
  });
});
