import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog.js';

afterEach(() => {
  cleanup();
});

describe('Dialog', () => {
  it('renders content with title and description when open', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Smoke Title</DialogTitle>
            <DialogDescription>Smoke description</DialogDescription>
          </DialogHeader>
          <DialogBody>Body text</DialogBody>
          <DialogFooter>Footer text</DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const title = screen.getByText('Smoke Title');
    expect(title.getAttribute('data-slot')).toBe('dialog-title');

    const desc = screen.getByText('Smoke description');
    expect(desc.getAttribute('data-slot')).toBe('dialog-description');

    expect(screen.getByText('Body text').closest('[data-slot="dialog-body"]')).toBeTruthy();
    expect(screen.getByText('Footer text').closest('[data-slot="dialog-footer"]')).toBeTruthy();
  });

  it('supports keyboard repositioning for draggable dialogs', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Movable Title</DialogTitle>
            <DialogDescription>Movable description</DialogDescription>
          </DialogHeader>
          <DialogBody>Body text</DialogBody>
        </DialogContent>
      </Dialog>,
    );

    const header = screen.getByLabelText('flux.dialog.moveDialog');
    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLDivElement | null;

    expect(header.getAttribute('tabindex')).toBe('0');
    expect(header.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight ArrowUp ArrowDown Home');
    expect(popup).toBeTruthy();

    Object.defineProperty(popup!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 100, top: 100, right: 400, bottom: 260, width: 300, height: 160 }),
    });

    fireEvent.keyDown(header, { key: 'ArrowRight' });
    expect(popup!.style.transform).toContain('translate(16px, 0px)');

    fireEvent.keyDown(header, { key: 'Home' });
    expect(popup!.style.transform).toBe('translate(-50%, -50%)');
  });

  it('uses token-backed overlay chrome instead of hardcoded black alpha', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>Overlay contract</DialogContent>
      </Dialog>,
    );

    const overlay = document.body.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay?.className).toContain('bg-surface-overlay');
    expect(overlay?.className).not.toContain('bg-black/10');
  });
});
