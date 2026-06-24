import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
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
  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
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
        <figcaption data-slot="video-fallback" className="text-xs text-muted-foreground">
          {errored ? 'Video failed to load' : 'No video source'}
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
        className="max-w-full rounded-md"
      />
      {hasTitle ? (
        <figcaption data-slot="video-title" className="text-sm text-muted-foreground">
          {titleContent}
        </figcaption>
      ) : null}
    </figure>
  );
}
