import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from './card.js';

describe('Card', () => {
  it('omits nop-haptic by default for non-interactive cards', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card?.className).not.toContain('nop-haptic');
  });

  it('applies nop-haptic when onClick is provided (M0.1c interactive card)', () => {
    const { container } = render(<Card onClick={() => undefined}>Clickable</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card?.className).toContain('nop-haptic');
  });

  it('is keyboard-reachable and activates via Enter/Space when interactive (P1-3)', () => {
    const onClick = vi.fn();
    const { container } = render(<Card onClick={onClick}>Clickable</Card>);
    const card = container.querySelector('[data-slot="card"]') as HTMLElement;

    expect(card.getAttribute('role')).toBe('button');
    expect(card.tabIndex).toBe(0);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('remains a plain non-interactive surface without onClick', () => {
    const { container } = render(<Card>Plain</Card>);
    const card = container.querySelector('[data-slot="card"]') as HTMLElement;
    expect(card.getAttribute('role')).toBeNull();
    expect(card.tabIndex).toBe(-1);
  });
});
