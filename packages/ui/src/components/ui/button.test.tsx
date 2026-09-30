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

  it('applies nop-haptic press-feedback class by default (M0.1c)', () => {
    const { container } = render(<Button>Press me</Button>);
    const button = container.querySelector('[data-slot="button"]');
    expect(button?.className).toContain('nop-haptic');
  });

  it('renders loading as spinner + disabled + aria-busy (R3-U27)', () => {
    render(<Button loading>Save</Button>);

    const button = screen.getByRole('button', { name: /Save/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('data-loading')).toBe('true');
    expect(button.querySelector('[role="status"]')).toBeTruthy();
  });

  it('keeps non-loading buttons enabled without aria-busy', () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.querySelector('[role="status"]')).toBeNull();
  });

  it('loading does not override an explicit disabled, and explicit disabled wins', () => {
    const { container } = render(
      <Button loading disabled>
        Both
      </Button>,
    );

    const button = container.querySelector('[data-slot="button"]') as HTMLElement;
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});
