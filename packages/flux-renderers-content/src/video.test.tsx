import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VideoRenderer } from './video.js';
import { createMockRendererProps } from './test-support.js';
import type { VideoSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function videoOf(container: HTMLElement) {
  return container.querySelector('[data-slot="video-media"]') as HTMLVideoElement;
}

describe('VideoRenderer', () => {
  it('renders the native <video> element with src and controls by default', () => {
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: { src: '/clip.mp4' },
    });
    const { container } = render(<VideoRenderer {...props} />);
    const video = videoOf(container);
    expect(video).toBeTruthy();
    expect(video.getAttribute('src')).toBe('/clip.mp4');
    expect(video.controls).toBe(true);
    expect(container.querySelector('.nop-video')).toBeTruthy();
  });

  it('passes muted through (muted belongs to video)', () => {
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: { src: '/clip.mp4', muted: true },
    });
    const { container } = render(<VideoRenderer {...props} />);
    expect(videoOf(container).muted).toBe(true);
  });

  it('passes autoPlay/loop/poster through', () => {
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: { src: '/clip.mp4', autoPlay: true, loop: true, poster: '/cover.png' },
    });
    const { container } = render(<VideoRenderer {...props} />);
    const video = videoOf(container);
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute('poster')).toBe('/cover.png');
  });

  it('hides controls when controls=false', () => {
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: { src: '/clip.mp4', controls: false },
    });
    const { container } = render(<VideoRenderer {...props} />);
    expect(videoOf(container).controls).toBe(false);
  });

  it('renders the empty fallback when no src is provided', () => {
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: {},
    });
    const { container } = render(<VideoRenderer {...props} />);
    const empty = container.querySelector('[data-slot="video"][data-state="empty"]');
    expect(empty).toBeTruthy();
    expect(container.querySelector('[data-slot="video-media"]')).toBeNull();
  });

  it('renders the error fallback and fires onLoadError when the media fails', () => {
    const onLoadError = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: { src: '/missing.mp4' },
      events: { onLoadError: onLoadError as never },
    });
    const { container } = render(<VideoRenderer {...props} />);
    fireEvent.error(videoOf(container));
    expect(onLoadError).toHaveBeenCalledTimes(1);
    const fallback = container.querySelector('[data-slot="video"][data-state="error"]');
    expect(fallback).toBeTruthy();
  });

  it('renders the title region when provided', () => {
    const props = createMockRendererProps<VideoSchema>({
      schema: { type: 'video' },
      props: { src: '/clip.mp4' },
      regions: { title: <span>Clip title</span> },
    });
    const { container } = render(<VideoRenderer {...props} />);
    const title = container.querySelector('[data-slot="video-title"]');
    expect(title?.textContent).toBe('Clip title');
  });
});
