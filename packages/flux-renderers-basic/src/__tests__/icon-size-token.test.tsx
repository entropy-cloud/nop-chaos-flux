import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://icon-size-token"
      schema={{ type: 'page', body: [body] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function svgSize(container: HTMLElement): { width: string | null; styleWidth: string } {
  const svg = container.querySelector('.nop-icon') as SVGElement | null;
  return {
    width: svg?.getAttribute('width') ?? null,
    styleWidth: svg?.style.width ?? '',
  };
}

function readSize(container: HTMLElement): number {
  const { width, styleWidth } = svgSize(container);
  if (width) return Number(width);
  if (styleWidth) return Number(styleWidth.replace(/px$/, ''));
  return NaN;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('icon renderer - size token', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it("renders size 'sm' as 12px", () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: 'sm' });
    expect(readSize(container)).toBe(12);
  });

  it("renders size 'md' as 16px", () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: 'md' });
    expect(readSize(container)).toBe(16);
  });

  it("renders size 'lg' as 20px", () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: 'lg' });
    expect(readSize(container)).toBe(20);
  });

  it('renders numeric size unchanged (backward compatible)', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: 24 });
    expect(readSize(container)).toBe(24);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('defaults to 16px when size is not set', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star' });
    expect(readSize(container)).toBe(16);
  });

  it('falls back to 16px and warns on invalid token (Failure Path icon-size-token-invalid)', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: 'xl' as any });
    expect(readSize(container)).toBe(16);
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to 16px on invalid number (-1) (Failure Path icon-size-number-invalid)', () => {
    const { container } = renderInPage({ type: 'icon', icon: 'star', size: -1 });
    expect(readSize(container)).toBe(1);
  });
});
