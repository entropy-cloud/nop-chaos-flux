import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from './sidebar-context.js';

afterEach(() => {
  cleanup();
});

describe('SidebarProvider keyboard shortcut (P1-5)', () => {
  it('does not hijack Cmd+B while focus is inside an editable control', () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider defaultOpen onOpenChange={onOpenChange}>
        <input data-testid="editable" />
      </SidebarProvider>,
    );
    const input = document.querySelector('[data-testid="editable"]') as HTMLElement;

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    input.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('toggles the sidebar on Cmd+B from a non-editable target', () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider defaultOpen onOpenChange={onOpenChange}>
        <div data-testid="plain">content</div>
      </SidebarProvider>,
    );
    const plain = document.querySelector('[data-testid="plain"]') as HTMLElement;

    const event = new KeyboardEvent('keydown', {
      key: 'b',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    plain.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
