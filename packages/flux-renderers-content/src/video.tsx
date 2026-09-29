import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { VideoSchema } from './schemas.js';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function VideoRenderer(props: RendererComponentProps<VideoSchema>) {
  const slotProps = props.props;
  const src = asString(slotProps.src);
  const poster = asString(slotProps.poster);
  const autoPlay = slotProps.autoPlay === true;
  const loop = slotProps.loop === true;
  const controls = slotProps.controls !== false;
  const muted = slotProps.muted === true;
  const rawWidth = slotProps.width;
  const rawHeight = slotProps.height;
  const widthStyle = typeof rawWidth === 'number' ? `${rawWidth}px` : rawWidth;
  const heightStyle = typeof rawHeight === 'number' ? `${rawHeight}px` : rawHeight;
  const videoStyle: React.CSSProperties = {
    maxWidth: '100%',
    borderRadius: '0.375rem',
    ...(widthStyle ? { width: widthStyle } : {}),
    ...(heightStyle ? { height: heightStyle } : {}),
  };
  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
  const tracks = Array.isArray(slotProps.tracks)
    ? (slotProps.tracks as NonNullable<VideoSchema['tracks']>)
    : [];
  const onLoadError = props.events.onLoadError;

  const [errored, setErrored] = React.useState(false);

  React.useEffect(() => {
    setErrored(false);
  }, [src]);

  function handleError() {
    setErrored(true);
    void onLoadError?.();
  }

  if (!src || errored) {
    return (
      <figure
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="video"
        data-state={errored ? 'error' : 'empty'}
        className={cn('nop-video', props.meta.className)}
      >
        {poster ? (
          <img src={poster} alt="" data-slot="video-poster" className="max-w-full rounded-md" />
        ) : null}
        <figcaption
          data-slot="video-fallback"
          aria-live="polite"
          className={cn(
            'text-xs',
            // [G1-R2-视角5-01] failure is destructive-styled, distinct from the muted empty state.
            errored
              ? 'rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive'
              : 'text-muted-foreground',
          )}
        >
          {errored ? t('flux.common.loadFailed') : t('flux.common.noSource')}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="video"
      className={cn('nop-video', props.meta.className)}
    >
      <video
        data-slot="video-media"
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        controls={controls}
        muted={muted}
        onError={handleError}
        style={videoStyle}
      >
        {tracks.map((track) => (
          <track
            // content-derived key: same src+lang+kind may not repeat within a
            // media element
            key={`${track.kind}:${track.srcLang ?? ''}:${track.src}`}
            kind={track.kind}
            src={track.src}
            srcLang={track.srcLang}
            label={track.label}
            default={track.default}
          />
        ))}
      </video>
      {hasTitle ? (
        <figcaption data-slot="video-title" className="text-sm text-muted-foreground">
          {titleContent}
        </figcaption>
      ) : null}
    </figure>
  );
}
