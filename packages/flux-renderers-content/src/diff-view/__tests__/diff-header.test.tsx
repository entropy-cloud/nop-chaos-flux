import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiffHeader } from '../components/diff-header.js';

afterEach(() => {
  cleanup();
});

describe('[G1-视角1-07] diff-header nav buttons use lucide icons', () => {
  it('renders prev/next file navigation through svg icons, not text arrows', () => {
    const { container } = render(
      <DiffHeader
        stats={{ added: 1, removed: 0, total: 1 }}
        viewType="split"
        onToggleView={vi.fn()}
        showNavButtons={true}
        hasPrevFile={true}
        hasNextFile={true}
        onPrevFile={vi.fn()}
        onNextFile={vi.fn()}
      />,
    );

    for (const selector of ['.nop-diff-nav-prev', '.nop-diff-nav-next']) {
      const button = container.querySelector(selector) as HTMLElement;
      expect(button, `${selector} should render`).toBeTruthy();
      expect(button.querySelector('svg'), `${selector} should contain a lucide icon`).toBeTruthy();
      expect(button.textContent).not.toMatch(/[↑↓]/);
      expect(button.getAttribute('aria-label')).toBeTruthy();
    }
  });
});
