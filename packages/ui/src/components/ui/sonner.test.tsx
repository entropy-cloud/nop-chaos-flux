import React from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sonnerMock = vi.hoisted(() => {
  let lastProps: Record<string, unknown> = {};
  const Toaster = (props: Record<string, unknown>) => {
    lastProps = props;
    return React.createElement('div', { 'data-testid': 'sonner-mock' });
  };
  return { Toaster, getProps: () => lastProps };
});

vi.mock('sonner', () => ({
  Toaster: sonnerMock.Toaster,
}));

import { TOASTER_Z_INDEX, Toaster } from './sonner.js';

afterEach(() => {
  cleanup();
});

describe('Toaster props (P0-2)', () => {
  it('applies TOASTER_Z_INDEX, base className, lucide icons and toast classNames by default', () => {
    render(<Toaster />);
    const props = sonnerMock.getProps();

    expect(props.theme).toBe('light');
    expect(String(props.className)).toContain('toaster');
    expect(String(props.className)).toContain('group');

    const style = props.style as React.CSSProperties;
    expect(style.zIndex).toBe(TOASTER_Z_INDEX);
    expect(style['--normal-bg']).toBeDefined();

    const icons = props.icons as Record<string, unknown>;
    expect(icons.success).toBeTruthy();
    expect(icons.error).toBeTruthy();
    expect(icons.loading).toBeTruthy();

    const toastOptions = props.toastOptions as { classNames: { toast: string } };
    expect(toastOptions.classNames.toast).toBe('cn-toast');
  });

  it('merges caller className instead of wiping the base classes', () => {
    render(<Toaster className="my-custom-toast" />);
    const cls = String(sonnerMock.getProps().className);
    expect(cls).toContain('toaster');
    expect(cls).toContain('group');
    expect(cls).toContain('my-custom-toast');
  });

  it('keeps the exported z-index when a caller passes an inline style', () => {
    render(<Toaster style={{ top: 10 } as React.CSSProperties} />);
    const style = sonnerMock.getProps().style as React.CSSProperties;
    expect(style.zIndex).toBe(TOASTER_Z_INDEX);
    expect(style.top).toBe(10);
  });

  it('lets a caller override icons while keeping zIndex/className defaults', () => {
    const customSuccess = React.createElement('span');
    render(<Toaster icons={{ success: customSuccess } as never} />);
    const props = sonnerMock.getProps();
    const icons = props.icons as Record<string, unknown>;
    expect(icons.success).toBe(customSuccess);
    expect((props.style as React.CSSProperties).zIndex).toBe(TOASTER_Z_INDEX);
  });

  // B6.2 — T3: Flux 不得引入 per-variant duration 不对称（一致性「by omission」回归锚）
  it('T3: Flux Toaster does not set any duration (no per-variant asymmetry)', () => {
    render(<Toaster />);
    const props = sonnerMock.getProps();
    const toastOptions = props.toastOptions as Record<string, unknown>;
    // Flux sets classNames only — no top-level duration, all variants inherit sonner default.
    expect(toastOptions).toBeTruthy();
    expect(toastOptions.duration).toBeUndefined();
    // No duration (top-level or per-variant) anywhere in the serialized toastOptions.
    expect(JSON.stringify(toastOptions)).not.toMatch(/duration/i);
    // The wrapper itself never forwards a duration prop to sonner.
    expect((props as { duration?: number }).duration).toBeUndefined();
  });

  // B6.2 — T3 源结构 guard：防止有人在 wrapper 里重新引入 duration（含 per-variant 映射）
  it('T3 source guard: sonner.tsx wrapper defines no duration token', () => {
    const source = readFileSync('src/components/ui/sonner.tsx', 'utf8');
    expect(source).not.toMatch(/\bduration\b/i);
  });
});
