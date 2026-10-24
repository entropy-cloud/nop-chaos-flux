import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageDesigner } from './page-designer-page.js';

// P1-MA4.4-004 regression guard: transient hover/dragover intent must never
// enter the command channel — a hover/dragover storm leaves the undo stack
// empty (undo button disabled). The 22 pre-existing page-designer tests
// asserted visual hover properties only; mutating hover into a dispatch was
// invisible (audit Round B / B-01). Control leg proves the observation
// surface is live: a real command flips canUndo.

afterEach(cleanup);

async function openDesigner() {
  const view = render(<PageDesigner />);
  await waitFor(() => expect(view.getByTestId('page-designer-canvas')).toBeTruthy());
  await waitFor(() => expect(document.querySelector('[data-psid]')).toBeTruthy());
  return view;
}

function canvasAnchors(): HTMLElement[] {
  return [...document.querySelectorAll('[data-psid]')] as HTMLElement[];
}

function hoverStorm(anchors: HTMLElement[]) {
  const canvas = screen.getByTestId('page-designer-canvas');
  // canvas-bridge resolves hover by elementsFromPoint hit-test — stub it so
  // each canvas pointerMove resolves to a node anchor (real hover semantics)
  const elementsFromPoint = document.elementsFromPoint;
  try {
    for (const anchor of anchors) {
      document.elementsFromPoint = () => [anchor];
      fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
      fireEvent.dragOver(anchor, { clientX: 20, clientY: 20, dataTransfer: { dropEffect: null } } as never);
      fireEvent.dragLeave(anchor, { dataTransfer: { dropEffect: null } } as never);
    }
  } finally {
    document.elementsFromPoint = elementsFromPoint;
  }
}

describe('page-designer transient intent stays out of the command channel (P1-MA4.4-004)', () => {
  it('hover/dragover storms leave the undo stack empty; a real command enables undo', async () => {
    const view = await openDesigner();
    const anchors = canvasAnchors();
    expect(anchors.length).toBeGreaterThan(0);

    const undo = () => screen.getByTestId('page-designer-undo') as HTMLButtonElement;
    expect(undo().disabled).toBe(true);

    // cross-node hover/dragover storm (canvas-bridge hit-test is 50ms throttled)
    hoverStorm(anchors);
    await new Promise((resolve) => setTimeout(resolve, 120));
    hoverStorm(anchors);
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(undo().disabled).toBe(true);

    // control: a palette insert is a real command (S3/S4 idiom) — undo enables
    fireEvent.click(document.querySelector('[data-palette-item="container"]') as HTMLElement);
    await waitFor(() => expect(undo().disabled).toBe(false));
    expect(view).toBeTruthy();
  });
});
