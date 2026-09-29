import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => undefined,
  useRendererEnv: () => ({}),
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock', path: '/mock', update: vi.fn(), readVisible: () => ({}), readOwn: () => ({}), materializeVisible: () => ({}), merge: vi.fn() }),
  useScopeSelector: () => undefined,
  resolveRendererSlotContent: (_p: unknown, key: string) => (key === 'title' ? null : null),
  hasRendererSlotContent: () => false,
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    if (params && 'index' in params) return `Go to slide ${params.index}`;
    return key;
  },
}));

import { VideoRenderer } from './video.js';
import { AudioRenderer } from './audio.js';
import { CarouselRenderer } from './carousel.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { AudioSchema, CarouselSchema, VideoSchema } from './schemas.js';

afterEach(cleanup);

function rendererProps<T extends { type: string }>(schema: T, propOverrides: Record<string, unknown> = {}) {
  return {
    props: { ...propOverrides },
    meta: { visible: true, cid: 1 },
    id: `test-${schema.type}`,
    path: 'test',
    schema,
    templateNode: {},
    node: { scope: { id: 's', parent: undefined } },
    events: {},
    regions: {},
    helpers: {},
  } as unknown as RendererComponentProps<T>;
}

describe('diff-view dark tokens and focus rules (plan 2026-09-29-5 Phase 3)', () => {
  const css = readFileSync(join(import.meta.dirname, './diff-view/diff-view.css'), 'utf8');

  it('declares a [data-mode=dark] override set covering the full token collection', () => {
    const darkBlock = css.slice(css.indexOf("[data-mode='dark'] .nop-diff-view"));
    expect(darkBlock.length).toBeGreaterThan(0);
    for (const token of [
      'add-bg', 'del-bg', 'gutter-bg', 'gutter-text', 'header-bg', 'header-text',
      'muted-text', 'accent', 'active-bg', 'hover-bg', 'border', 'root-bg',
      'empty-text', 'toggle-bg', 'toggle-text', 'pane-header-bg',
      'stat-added-text', 'stat-removed-text', 'conflict-marker-text', 'flash-bg',
    ]) {
      expect(darkBlock).toContain(`--nop-diff-${token}:`);
    }
  });

  it('provides a prefers-color-scheme fallback scoped to unset data-mode', () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(":root:not([data-mode='light']) .nop-diff-view");
  });

  it('lifts gutter/muted text tokens to dark-surface legible lightness (≥4.5:1 basis)', () => {
    const darkBlock = css.slice(css.indexOf("[data-mode='dark'] .nop-diff-view"), css.indexOf('@media (prefers-color-scheme: dark)'));
    // oklch(72% …) on oklch(21% …) surface: lightness delta 51 points —
    // comfortably above the 4.5:1 contrast floor (was 62% on white ≈ 3.1:1)
    expect(darkBlock).toMatch(/--nop-diff-gutter-text: oklch\(7[2-9]% /);
    expect(darkBlock).toMatch(/--nop-diff-muted-text: oklch\(7[2-9]% /);
  });

  it('declares :focus-visible outlines for clickable lines and file rows', () => {
    expect(css).toContain('.nop-diff-line-clickable:focus-visible');
    expect(css).toContain("[role='button']:focus-visible");
    expect(css).toContain('outline: 2px solid var(--nop-diff-accent)');
  });
});

describe('video tracks (plan 2026-09-29-5 Phase 3)', () => {
  it('renders track children from schema; absent tracks renders bare video', () => {
    const { container, rerender } = render(
      <VideoRenderer
        {...rendererProps<VideoSchema>({ type: 'video' }, {
          src: 'movie.mp4',
          tracks: [
            { kind: 'captions', src: '/captions/en.vtt', srcLang: 'en', label: 'English', default: true },
            { kind: 'subtitles', src: '/captions/zh.vtt', srcLang: 'zh', label: '中文' },
          ],
        })}
      />,
    );
    const tracks = container.querySelectorAll('track');
    expect(tracks.length).toBe(2);
    expect(tracks[0]?.getAttribute('kind')).toBe('captions');
    expect(tracks[0]?.getAttribute('default')).toBe('');
    expect(tracks[1]?.getAttribute('srcLang')).toBe('zh');

    rerender(
      <VideoRenderer {...rendererProps<VideoSchema>({ type: 'video' }, { src: 'movie.mp4' })} />,
    );
    expect(container.querySelectorAll('track').length).toBe(0);
  });
});

describe('audio tracks (plan 2026-09-29-5 audit r1 finding 2)', () => {
  it('renders track children from schema for the audio element', () => {
    const { container } = render(
      <AudioRenderer
        {...rendererProps<AudioSchema>({ type: 'audio' }, {
          src: 'episode.mp3',
          tracks: [{ kind: 'chapters', src: '/chapters.vtt', srcLang: 'en' }],
        })}
      />,
    );
    const tracks = container.querySelectorAll('track');
    expect(tracks.length).toBe(1);
    expect(tracks[0]?.getAttribute('kind')).toBe('chapters');
  });
});

describe('carousel indicator aria-current (plan 2026-09-29-5 Phase 3)', () => {
  it('marks the active indicator with aria-current', () => {
    const { container } = render(
      <CarouselRenderer
        {...rendererProps<CarouselSchema>({ type: 'carousel' }, {
          items: [{ image: '/a.png' }, { image: '/b.png' }],
          showIndicators: true,
          autoPlay: false,
        })}
      />,
    );
    const indicators = container.querySelectorAll('[data-slot="carousel-indicator"]');
    expect(indicators.length).toBe(2);
    expect(indicators[0]?.getAttribute('aria-current')).toBe('true');
    expect(indicators[1]?.getAttribute('aria-current')).toBeNull();
  });
});

describe('image preview dialog accessible name (plan 2026-09-29-5 Phase 3)', () => {
  it('names the preview dialog from alt with a sr-only title', async () => {
    const { ImageRenderer } = await import('./image.js');
    const { container } = render(
      <ImageRenderer
        {...rendererProps<{ type: 'image' }>({ type: 'image' } as never, {
          src: '/pic.png',
          alt: 'Architecture diagram',
          preview: true,
        })}
      />,
    );
    fireEvent.click(container.querySelector('.nop-image') as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Architecture diagram');
    expect(dialog.querySelector('.sr-only')?.textContent).toBe('Architecture diagram');
  });
});
