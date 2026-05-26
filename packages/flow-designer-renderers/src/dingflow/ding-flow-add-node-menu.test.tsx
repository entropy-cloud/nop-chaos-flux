// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DingFlowAddNodeMenu } from './ding-flow-add-node-menu.js';

afterEach(() => {
  cleanup();
});

describe('DingFlowAddNodeMenu', () => {
  it('implements roving menu keyboard navigation', async () => {
    render(
      <DingFlowAddNodeMenu
        screenX={100}
        screenY={100}
        items={[
          { type: 'task', label: 'Task', color: '#000', icon: <span>T</span> },
          { type: 'branch', label: 'Branch', color: '#111', icon: <span>B</span> },
          { type: 'end', label: 'End', color: '#222', icon: <span>E</span> },
        ]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const task = screen.getByRole('menuitem', { name: 'Task' });
    const branch = screen.getByRole('menuitem', { name: 'Branch' });
    const end = screen.getByRole('menuitem', { name: 'End' });

    await waitFor(() => expect(task.tabIndex).toBe(0));
    expect(branch.tabIndex).toBe(-1);
    expect(end.tabIndex).toBe(-1);

    task.focus();
    fireEvent.keyDown(screen.getByRole('menu', { name: 'Add node' }), { key: 'ArrowRight' });
    expect(branch.tabIndex).toBe(0);

    branch.focus();
    fireEvent.keyDown(screen.getByRole('menu', { name: 'Add node' }), { key: 'End' });
    expect(end.tabIndex).toBe(0);

    end.focus();
    fireEvent.keyDown(screen.getByRole('menu', { name: 'Add node' }), { key: 'Home' });
    expect(task.tabIndex).toBe(0);
  });

  it('restores focus to the trigger when Escape closes the menu', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const returnFocusRef = { current: trigger };
    const onClose = vi.fn();

    render(
      <DingFlowAddNodeMenu
        screenX={100}
        screenY={100}
        items={[{ type: 'task', label: 'Task', color: '#000', icon: <span>T</span> }]}
        onSelect={vi.fn()}
        onClose={onClose}
        returnFocusRef={returnFocusRef}
      />,
    );

    fireEvent.keyDown(screen.getByRole('menu', { name: 'Add node' }), {
      key: 'Escape',
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });

  it('restores focus to the trigger after selecting a menu item', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const returnFocusRef = { current: trigger };
    const onSelect = vi.fn();

    render(
      <DingFlowAddNodeMenu
        screenX={100}
        screenY={100}
        items={[{ type: 'task', label: 'Task', color: '#000', icon: <span>T</span> }]}
        onSelect={onSelect}
        onClose={vi.fn()}
        returnFocusRef={returnFocusRef}
      />,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Task' }));

    expect(onSelect).toHaveBeenCalledWith('task');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });
});
