import { cleanup, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-touch-adaptation"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

describe('button touch adaptation (M2c)', () => {
  it('enlarges default-size button to min-h-11 (>=44px) on mobile', () => {
    mobileState.isMobile = true;
    renderButton({ type: 'button', label: 'Submit', testid: 'submit-btn' });
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.className).toContain('min-h-11');
  });

  it('enlarges lg-size button to min-h-11 on mobile', () => {
    mobileState.isMobile = true;
    renderButton({ type: 'button', label: 'Primary', size: 'lg', testid: 'lg-btn' });
    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button.className).toContain('min-h-11');
  });

  it('does not force min-h-11 on sm-size button (compact stays compact)', () => {
    mobileState.isMobile = true;
    renderButton({ type: 'button', label: 'Small', size: 'sm', testid: 'sm-btn' });
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button.className).not.toContain('min-h-11');
  });

  it('does not add min-h-11 on desktop (behavior unchanged)', () => {
    mobileState.isMobile = false;
    renderButton({ type: 'button', label: 'Submit', testid: 'submit-btn' });
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.className).not.toContain('min-h-11');
  });

  it('keeps schema block (w-full) behavior unchanged on mobile', () => {
    mobileState.isMobile = true;
    renderButton({ type: 'button', label: 'Full', block: true, testid: 'block-btn' });
    const button = screen.getByRole('button', { name: 'Full' });
    expect(button.className).toContain('w-full');
    expect(button.className).toContain('min-h-11');
  });

  it('keeps nop-haptic enabled (M0.1c, desktop-safe按压反馈)', () => {
    mobileState.isMobile = false;
    renderButton({ type: 'button', label: 'Haptic', testid: 'haptic-btn' });
    const button = screen.getByRole('button', { name: 'Haptic' });
    expect(button.className).toContain('nop-haptic');
  });

  it('does not deform multiple buttons in a row (each gets its own min-h-11, independent)', () => {
    mobileState.isMobile = true;
    renderButton({
      type: 'flex',
      direction: 'row',
      gap: 2,
      body: [
        { type: 'button', label: 'Cancel', testid: 'cancel-btn' },
        { type: 'button', label: 'OK', testid: 'ok-btn' },
      ],
    } as BaseSchema);
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const ok = screen.getByRole('button', { name: 'OK' });
    expect(cancel.className).toContain('min-h-11');
    expect(ok.className).toContain('min-h-11');
    // both remain inline (block not set), no forced w-full stacking
    expect(cancel.className).not.toContain('w-full');
    expect(ok.className).not.toContain('w-full');
  });
});
