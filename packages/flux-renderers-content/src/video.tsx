import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { CSSProperties } from 'react';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { VideoSchema } from './schemas.js';
import { MediaFallbackFigure, asString, renderMediaTracks, useMediaErrorState } from './media-shared.js';

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
  const videoStyle: CSSProperties = {
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
  const { errored, handleError } = useMediaErrorState(src, onLoadError);

  if (!src || errored) {
    return (
      <MediaFallbackFigure
        testid={props.meta.testid || undefined}
        cid={props.meta.cid || undefined}
        slot="video"
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
        {renderMediaTracks(tracks)}
      </video>
      {hasTitle ? (
        <figcaption data-slot="video-title" className="text-sm text-muted-foreground">
          {titleContent}
        </figcaption>
      ) : null}
    </figure>
  );
}
