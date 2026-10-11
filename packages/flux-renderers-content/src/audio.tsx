import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { AudioSchema } from './schemas.js';
import { MediaFallbackFigure, asString, renderMediaTracks, useMediaErrorState } from './media-shared.js';

export function AudioRenderer(props: RendererComponentProps<AudioSchema>) {
  const slotProps = props.props;
  const src = asString(slotProps.src);
  const poster = asString(slotProps.poster);
  const autoPlay = slotProps.autoPlay === true;
  const loop = slotProps.loop === true;
  const controls = slotProps.controls !== false;
  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
  const tracks = Array.isArray(slotProps.tracks)
    ? (slotProps.tracks as NonNullable<AudioSchema['tracks']>)
    : [];
  const onLoadError = props.events.onLoadError;
  const { errored, handleError } = useMediaErrorState(src, onLoadError);

  if (!src || errored) {
    return (
      <MediaFallbackFigure
        testid={props.meta.testid || undefined}
        cid={props.meta.cid || undefined}
        slot="audio"
        className={props.meta.className}
        poster={poster}
        errored={errored}
      />
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
      >
        {renderMediaTracks(tracks)}
      </audio>
      {hasTitle ? (
        <figcaption data-slot="audio-title" className="text-sm text-muted-foreground">
          {titleContent}
        </figcaption>
      ) : null}
    </figure>
  );
}
