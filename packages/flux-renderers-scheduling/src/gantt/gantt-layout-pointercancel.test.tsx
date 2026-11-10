import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { GanttLayout } from './gantt-layout.js';

function fire(type: string, clientX: number) {
  document.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// Plan 862 L6: pointercancel must tear the drag down (listeners removed, body
// styles restored) just like pointerup does.
describe('GanttLayout drag pointercancel (plan 862 L6)', () => {
  it('pointercancel stops the drag and restores body styles', () => {
    const view = render(<GanttLayout grid={null} timeline={null} header={null} />);
    const separator = view.container.querySelector('[role="separator"]') as HTMLElement;

    fireEvent.pointerDown(separator, { clientX: 100 });
    expect(document.body.style.cursor).toBe('col-resize');

    fire('pointercancel', 150);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');

    const widthBefore = separator.getAttribute('aria-valuenow');
    fire('pointermove', 400);
    expect(separator.getAttribute('aria-valuenow')).toBe(widthBefore);
  });
});
