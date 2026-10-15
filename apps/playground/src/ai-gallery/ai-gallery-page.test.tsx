// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AiGalleryPage } from './ai-gallery-page';
import { AI_GALLERY_ENTRIES, AI_GALLERY_PHASE_ORDER } from './ai-gallery-model';

afterEach(cleanup);

function renderShell(activeDemoId: string | null = null) {
  return render(
    <AiGalleryPage
      activeDemoId={activeDemoId}
      onSelectDemo={() => undefined}
      onBack={() => undefined}
    />,
  );
}

describe('AiGalleryPage shell', () => {
  it('renders the shell with a nav item for every gallery entry', () => {
    renderShell();
    expect(screen.getByTestId('ai-gallery')).toBeTruthy();
    for (const entry of AI_GALLERY_ENTRIES) {
      expect(screen.getByTestId(`ai-nav-${entry.id}`)).toBeTruthy();
    }
  });

  it('renders one nav group per phase and a back-to-home control', () => {
    renderShell();
    for (const phase of AI_GALLERY_PHASE_ORDER) {
      expect(screen.getByTestId(`ai-nav-group-${phase}`)).toBeTruthy();
    }
    expect(screen.getByTestId('ai-gallery-back')).toBeTruthy();
  });

  it('shows the empty state (no embedded demo) when no demo is selected', () => {
    renderShell(null);
    expect(screen.getByText(/demos available/)).toBeTruthy();
    expect(screen.queryByTestId(/^ai-gallery-demo-/)).toBeNull();
  });
});
