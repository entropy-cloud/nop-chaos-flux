import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { DiffFileMeta, DiffViewSchema } from '../../schemas.js';

const registerMock = vi.fn();
const mockRegistry = {
  register: registerMock,
} as unknown as ComponentHandleRegistry;

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => mockRegistry,
  };
});

const { DiffViewRenderer } = await import('../diff-view-renderer.js');
const { DiffFileList } = await import('../components/diff-file-list.js');
const { createMockRendererProps } = await import('../../test-support.js');

const sampleFiles: DiffFileMeta[] = [
  { fileName: 'src/index.ts', oldContent: 'a', newContent: 'b', status: 'modified' },
];

function createMockProps(overrides: Record<string, unknown> = {}) {
  return createMockRendererProps<DiffViewSchema>({
    props: {
      oldContent: 'line1\nline2',
      newContent: 'line1\nchanged',
      viewType: 'split' as const,
      ...overrides,
    },
  });
}

afterEach(() => {
  cleanup();
  registerMock.mockReset();
});

describe('[G1-R2-视角8-02] diff-view narrow-container degradation', () => {
  it('file-list sidebar width is class-owned and container-relative, not a fixed inline 240px', () => {
    const { container } = render(
      <DiffFileList
        files={sampleFiles}
        activeIndex={0}
        onFileSelect={vi.fn() as (index: number) => void}
      />,
    );
    const list = container.querySelector('[data-slot="diff-file-list"]') as HTMLElement;
    expect(list).toBeTruthy();
    expect(list.className).toContain('nop-diff-file-list');
    expect(list.style.width).toBe('');

    const css = readFileSync('src/diff-view/diff-view.css', 'utf8');
    const rule = css.match(/\.nop-diff-file-list\s*\{[^}]*\}/);
    expect(rule, 'diff-view.css must own the sidebar width').toBeTruthy();
    expect(rule![0]).toContain('clamp(');
    expect(rule![0]).toMatch(/%/);
  });

  it('split/unified panes grid is class-owned so the mobile media query can override it', () => {
    const { container } = render(<DiffViewRenderer {...createMockProps({ viewType: 'split' })} />);
    const panes = container.querySelector('.nop-diff-view-panes') as HTMLElement;
    expect(panes).toBeTruthy();
    expect(panes.getAttribute('data-panes')).toBe('split');
    // The old inline grid-template-columns defeated the max-width:640px override;
    // the grid must live in the stylesheet now.
    expect(panes.style.gridTemplateColumns).toBe('');

    const css = readFileSync('src/diff-view/diff-view.css', 'utf8');
    const baseRule = css.match(/\.nop-diff-view-panes\[data-panes='split'\]\s*\{[^}]*\}/);
    expect(baseRule, 'desktop split grid rule must exist').toBeTruthy();
    expect(baseRule![0]).toContain('1fr 1fr');

    const mediaSlice = css.slice(css.indexOf('@media (max-width: 640px)'));
    expect(mediaSlice).toContain(".nop-diff-view-panes[data-panes='split']");
    expect(mediaSlice).toMatch(/grid-template-columns:\s*1fr/);
    expect(mediaSlice).toContain('.nop-diff-file-list');
  });

  it('unified view keeps a single-pane grid', () => {
    const { container } = render(
      <DiffViewRenderer {...createMockProps({ viewType: 'unified' })} />,
    );
    const panes = container.querySelector('.nop-diff-view-panes') as HTMLElement;
    expect(panes).toBeTruthy();
    expect(panes.getAttribute('data-panes')).toBe('unified');
  });
});
