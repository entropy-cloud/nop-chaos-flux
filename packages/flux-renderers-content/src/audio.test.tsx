// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioRenderer } from './audio.js';
import { createMockRendererProps } from './test-support.js';
import type { AudioSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function audioOf(container: HTMLElement) {
  return container.querySelector('[data-slot="audio-media"]') as HTMLAudioElement;
}

describe('AudioRenderer', () => {
  it('renders the native <audio> element with src and controls by default', () => {
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      props: { src: '/clip.mp3' },
    });
    const { container } = render(<AudioRenderer {...props} />);
    const audio = audioOf(container);
    expect(audio).toBeTruthy();
    expect(audio.getAttribute('src')).toBe('/clip.mp3');
    expect(audio.controls).toBe(true);
    expect(container.querySelector('.nop-audio')).toBeTruthy();
  });

  it('passes autoPlay and loop through', () => {
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      props: { src: '/clip.mp3', autoPlay: true, loop: true },
    });
    const { container } = render(<AudioRenderer {...props} />);
    const audio = audioOf(container);
    expect(audio.autoplay).toBe(true);
    expect(audio.loop).toBe(true);
  });

  it('hides controls when controls=false', () => {
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      props: { src: '/clip.mp3', controls: false },
    });
    const { container } = render(<AudioRenderer {...props} />);
    expect(audioOf(container).controls).toBe(false);
  });

  it('does not pass muted through (muted belongs to video only)', () => {
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      // muted intentionally absent from AudioSchema; cast to verify it is ignored
      props: { src: '/clip.mp3', muted: true } as unknown as Record<string, unknown>,
    });
    const { container } = render(<AudioRenderer {...props} />);
    expect(audioOf(container).muted).toBe(false);
  });

  it('renders the empty fallback when no src is provided', () => {
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      props: {},
    });
    const { container } = render(<AudioRenderer {...props} />);
    const empty = container.querySelector('[data-slot="audio"][data-state="empty"]');
    expect(empty).toBeTruthy();
    expect(container.querySelector('[data-slot="audio-media"]')).toBeNull();
  });

  it('renders the error fallback and fires onLoadError when the media fails', () => {
    const onLoadError = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      props: { src: '/missing.mp3' },
      events: { onLoadError: onLoadError as never },
    });
    const { container } = render(<AudioRenderer {...props} />);
    const audio = audioOf(container);
    fireEvent.error(audio);
    expect(onLoadError).toHaveBeenCalledTimes(1);
    const fallback = container.querySelector('[data-slot="audio"][data-state="error"]');
    expect(fallback).toBeTruthy();
  });

  it('renders the title region when provided', () => {
    const props = createMockRendererProps<AudioSchema>({
      schema: { type: 'audio' },
      props: { src: '/clip.mp3' },
      regions: { title: <span>Track title</span> },
    });
    const { container } = render(<AudioRenderer {...props} />);
    const title = container.querySelector('[data-slot="audio-title"]');
    expect(title?.textContent).toBe('Track title');
  });
});
