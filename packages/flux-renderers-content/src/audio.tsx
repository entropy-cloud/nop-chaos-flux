import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { AudioSchema } from './schemas.js';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function AudioRenderer(props: RendererComponentProps<AudioSchema>) {
  const slotProps = props.props;
  const src = asString(slotProps.src);
  const poster = asString(slotProps.poster);
  const autoPlay = slotProps.autoPlay === true;
  const loop = slotProps.loop === true;
  const controls = slotProps.controls !== false;
  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
  const onLoadError = props.events.onLoadError;

  const [errored, setErrored] = React.useState(false);

  // Reset the error flag when the src changes so a corrected URL re-renders.
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
        data-slot="audio"
        data-state={errored ? 'error' : 'empty'}
        className={cn('nop-audio', props.meta.className)}
      >
        {poster ? (
          <img src={poster} alt="" data-slot="audio-poster" className="max-w-full rounded-md" />
        ) : null}
        <figcaption data-slot="audio-fallback" className="text-xs text-muted-foreground">
          {errored ? 'Audio failed to load' : 'No audio source'}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="audio"
      className={cn('nop-audio', props.meta.className)}
    >
      {poster ? (
        <img src={poster} alt="" data-slot="audio-poster" className="max-w-full rounded-md" />
      ) : null}
      <audio
        data-slot="audio-media"
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        controls={controls}
        onError={handleError}
      />
      {hasTitle ? (
        <figcaption data-slot="audio-title" className="text-sm text-muted-foreground">
          {titleContent}
        </figcaption>
      ) : null}
    </figure>
  );
}
