import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
