import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Dialog, DialogContent, cn } from '@nop-chaos/ui';
import type { ImageFit, ImageSchema } from './schemas.js';

const FIT_TO_CLASS: Record<ImageFit, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

const VALID_FITS: ReadonlySet<ImageFit> = new Set([
  'contain',
  'cover',
  'fill',
  'none',
  'scale-down',
]);

function supportsNativeLazy(): boolean {
  return (
    typeof HTMLImageElement !== 'undefined' &&
    'loading' in HTMLImageElement.prototype
  );
}

function toSize(value: unknown): string | number | undefined {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return undefined;
}

export function ImageRenderer(props: RendererComponentProps<ImageSchema>) {
  const slotProps = props.props;
  const src =
    typeof slotProps.src === 'string' && slotProps.src.length > 0 ? slotProps.src : undefined;
  const alt = typeof slotProps.alt === 'string' ? slotProps.alt : '';
  const title = typeof slotProps.title === 'string' ? slotProps.title : undefined;
  const preview = slotProps.preview === true;
  const lazy = slotProps.lazy === true;
  const fit: ImageFit = VALID_FITS.has(slotProps.fit as ImageFit)
    ? (slotProps.fit as ImageFit)
    : 'cover';
  const width = toSize(slotProps.width);
  const height = toSize(slotProps.height);

  const [errored, setErrored] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  // Old browsers without native lazy loading get an IntersectionObserver
  // fallback that defers setting `src` until the image scrolls into view.
  const useIoFallback = lazy && !supportsNativeLazy();

  React.useEffect(() => {
    if (!useIoFallback || !imgRef.current) {
      return;
    }
    const el = imgRef.current;
    const pendingSrc = src;
    if (!pendingSrc) {
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.setAttribute('src', pendingSrc);
          io.disconnect();
        }
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [useIoFallback, src]);

  const onLoadError = props.events.onLoadError;
  const onClick = props.events.onClick;

  function handleError() {
    setErrored(true);
    void onLoadError?.();
  }

  function handleClick() {
    if (preview) {
      setPreviewOpen(true);
    }
    void onClick?.();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLImageElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    handleClick();
  }

  const interactive = preview || Boolean(onClick);
  const sizeStyle = React.useMemo(
    () => ({ width, height }),
    [width, height],
  );

  if (!src || errored) {
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="image"
        data-state={errored ? 'error' : 'empty'}
        style={sizeStyle}
        className={cn(
          'nop-image nop-image-fallback inline-flex items-center justify-center bg-muted text-xs text-muted-foreground',
          props.meta.className,
        )}
      >
        <span data-slot="image-fallback">{alt || 'image'}</span>
      </div>
    );
  }

  return (
    <>
      <img
        ref={imgRef}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="image"
        data-preview={preview ? 'true' : undefined}
        src={useIoFallback ? undefined : src}
        alt={alt}
        title={title}
        loading={lazy ? 'lazy' : undefined}
        onError={handleError}
        onClick={interactive ? handleClick : undefined}
        onKeyDown={interactive ? handleKeyDown : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        style={{ ...sizeStyle, cursor: interactive ? 'pointer' : undefined }}
        className={cn('nop-image', FIT_TO_CLASS[fit], props.meta.className)}
      />
      {preview && previewOpen ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl" showCloseButton>
            <img
              src={src}
              alt={alt}
              data-slot="image-preview"
              className="max-h-[80vh] w-auto object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
