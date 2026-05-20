// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DingFlowAddNodeMenu } from './ding-flow-add-node-menu.js';

describe('DingFlowAddNodeMenu', () => {
  it('implements roving menu keyboard navigation', () => {
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

    expect(task.tabIndex).toBe(0);
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
});
