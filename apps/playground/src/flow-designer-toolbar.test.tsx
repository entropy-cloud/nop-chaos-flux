import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { FlowDesignerToolbar } from './flow-designer/flow-designer-toolbar.js';

afterEach(() => {
  cleanup();
});

// R3-U10: the Designer/JSON view switch previously conveyed its active state
// only through a styling attribute — assistive tech could not tell which view
// was active. aria-pressed pins the toggle semantics.
describe('FlowDesignerToolbar view toggle ARIA state', () => {
  it('exposes the active view via aria-pressed and switches on click', () => {
    const onTabChange = vi.fn();
    const view = render(
      <FlowDesignerToolbar
        docName="flow-1"
        canUndo
        canRedo
        activeTab="designer"
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onClearSelection={vi.fn()}
        onTabChange={onTabChange}
        onSave={vi.fn()}
        onRestore={vi.fn()}
        onExport={vi.fn()}
      />,
    );

    const designerTab = view.getByRole('button', { name: 'Designer' });
    const jsonTab = view.getByRole('button', { name: 'JSON' });
    expect(designerTab.getAttribute('aria-pressed')).toBe('true');
    expect(jsonTab.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(jsonTab);
    expect(onTabChange).toHaveBeenCalledWith('json');
  });

  it('flips aria-pressed when the JSON tab is active', () => {
    const view = render(
      <FlowDesignerToolbar
        docName="flow-1"
        canUndo
        canRedo
        activeTab="json"
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onClearSelection={vi.fn()}
        onTabChange={vi.fn()}
        onSave={vi.fn()}
        onRestore={vi.fn()}
        onExport={vi.fn()}
      />,
    );
    expect(view.getByRole('button', { name: 'Designer' }).getAttribute('aria-pressed')).toBe('false');
    expect(view.getByRole('button', { name: 'JSON' }).getAttribute('aria-pressed')).toBe('true');
  });
});
