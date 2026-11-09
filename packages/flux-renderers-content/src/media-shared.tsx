import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { MediaTrackSchema } from './schemas.js';

// WA-content-002 (plan 567): audio and video were born in the same batch
// (ab2913961) each carrying a verbatim copy of the media lifecycle skeleton —
// error state with reset-on-src, the fallback figure, and the <track> list.
// Later waves had to land the same edit twice (G4-R2 failure styling). Shared
// here; the schema-facing differences (video's poster/muted/size) stay with
// each renderer.

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Error flag that resets when src changes, so a corrected URL re-renders. */
export function useMediaErrorState(
  src: string | undefined,
  onLoadError: (() => void) | undefined,
): { errored: boolean; handleError: () => void } {
  // Render-time reset when src changes (instead of an effect-driven reset
  // pass): any src change — including back to a previously failed one —
  // starts from a clean, retryable state.
  const [state, setState] = React.useState({ src, errored: false });
  if (state.src !== src) {
    setState({ src, errored: false });
  }
  const errored = state.src === src && state.errored;

  const handleError = () => {
    setState({ src, errored: true });
    void onLoadError?.();
  };

  return { errored, handleError };
}

/** Fallback figure for the empty (no src) and error states. */
export function MediaFallbackFigure(args: {
  testid?: string | number;
  cid?: string | number;
  slot: string;
  className?: string;
  poster: string | undefined;
  errored: boolean;
}) {
  return (
    <figure
      data-testid={args.testid}
      data-cid={args.cid}
      data-slot={args.slot}
      data-state={args.errored ? 'error' : 'empty'}
      className={cn(`nop-${args.slot}`, args.className)}
    >
      {args.poster ? (
        <img src={args.poster} alt="" data-slot={`${args.slot}-poster`} className="max-w-full rounded-md" />
      ) : null}
      <figcaption
        data-slot={`${args.slot}-fallback`}
        aria-live="polite"
        className={cn(
          'text-xs',
          // [G1-R2-视角5-01] failure is destructive-styled, distinct from the muted empty state.
          args.errored
            ? 'rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive'
            : 'text-muted-foreground',
        )}
      >
        {args.errored ? t('flux.common.loadFailed') : t('flux.common.noSource')}
      </figcaption>
    </figure>
  );
}

/** Shared <track> list (content-derived key: same src+lang+kind may not repeat). */
export function renderMediaTracks(tracks: MediaTrackSchema[]) {
  return tracks.map((track) => (
    <track
      key={`${track.kind}:${track.srcLang ?? ''}:${track.src}`}
      kind={track.kind}
      src={track.src}
      srcLang={track.srcLang}
      label={track.label}
      default={track.default}
    />
  ));
}
