import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';

describe('Button', () => {
  it('renders with button role and data-slot', () => {
    render(<Button type="button">Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeTruthy();
    expect(button.getAttribute('data-slot')).toBe('button');
  });

  it('applies variant and size classes', () => {
    const { container } = render(
      <Button type="button" variant="destructive" size="lg">
        Delete
      </Button>,
    );

    const button = container.querySelector('[data-slot="button"]');
    expect(button?.className).toContain('destructive');
  });

  it('defaults to type button', () => {
    render(<Button>Safe button</Button>);

    const button = screen.getByRole('button', { name: 'Safe button' });
    expect(button.getAttribute('type')).toBe('button');
  });

  it('preserves explicit submit type', () => {
    render(<Button type="submit">Submit</Button>);

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.getAttribute('type')).toBe('submit');
  });
});
