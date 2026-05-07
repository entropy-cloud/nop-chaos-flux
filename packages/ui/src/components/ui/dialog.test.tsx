import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog.js';

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
});
