import React from 'react';
import QRCode from 'qrcode';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { QrCodeLevel, QrCodeSchema } from './schemas.js';

const VALID_LEVELS: ReadonlySet<QrCodeLevel> = new Set(['L', 'M', 'Q', 'H']);
const DEFAULT_SIZE = 128;

function resolveLevel(value: unknown): QrCodeLevel {
  return VALID_LEVELS.has(value as QrCodeLevel) ? (value as QrCodeLevel) : 'M';
}

export function QrCodeRenderer(props: RendererComponentProps<QrCodeSchema>) {
  const slotProps = props.props;
  const rawValue = slotProps.value;
  const valueStr =
    typeof rawValue === 'string'
      ? rawValue
      : rawValue === undefined || rawValue === null
        ? ''
        : String(rawValue);
  const size =
    typeof slotProps.size === 'number' && slotProps.size > 0 ? slotProps.size : DEFAULT_SIZE;
  const level = resolveLevel(slotProps.level);
  const foreground =
    typeof slotProps.foreground === 'string' && slotProps.foreground.length > 0
      ? slotProps.foreground
      : '#000000';
  const background =
    typeof slotProps.background === 'string' && slotProps.background.length > 0
      ? slotProps.background
      : '#ffffff';
  const labelContent = resolveRendererSlotContent(props, 'label');
  const hasLabel = hasRendererSlotContent(labelContent);
  const onLoadError = props.events.onLoadError;

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = React.useState(false);

  // Render the QR matrix onto the canvas whenever inputs change.
  // AUDIT-13 exemption: QRCode.toCanvas has no AbortSignal support, so this
  // decoration/preview render uses a bare `cancelled` closure flag to suppress
  // stale result handling. The canvas draw is idempotent (a newer render simply
  // overwrites the stale frame), so there is no user-visible data-integrity
  // impact; only the error-state side effect is guarded.
  React.useEffect(() => {
    setFailed(false);
    if (!canvasRef.current || valueStr.length === 0) {
      return;
    }
    let cancelled = false;
    QRCode.toCanvas(canvasRef.current, valueStr, {
      width: size,
      errorCorrectionLevel: level,
      margin: 1,
      color: { dark: foreground, light: background },
    }).catch((error: unknown) => {
      if (!cancelled) {
        setFailed(true);
        // Align with the image/audio/video family: surface the failure as an event
        // so schema authors can attach error handling.
        void onLoadError?.();
        if (import.meta.env?.DEV === true) {
          console.warn('[qrcode] render failed:', error);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [valueStr, size, level, foreground, background, onLoadError]);

  if (valueStr.length === 0 || failed) {
    return (
      <figure
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="qrcode"
        data-state={failed ? 'error' : 'empty'}
        className={cn('nop-qrcode inline-flex flex-col items-center gap-2', props.meta.className)}
      >
        <div
          data-slot="qrcode-fallback"
          style={{ width: size, height: size }}
          className="flex items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
        >
          {failed ? 'QR code failed' : 'No value'}
        </div>
        {hasLabel ? (
          <figcaption data-slot="qrcode-label" className="text-sm text-muted-foreground">
            {labelContent}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="qrcode"
      className={cn('nop-qrcode inline-flex flex-col items-center gap-2', props.meta.className)}
    >
      <canvas
        ref={canvasRef}
        data-slot="qrcode-canvas"
        role="img"
        aria-label={typeof labelContent === 'string' ? labelContent : `QR code for ${valueStr}`}
        className="rounded-md"
      />
      {hasLabel ? (
        <figcaption data-slot="qrcode-label" className="text-sm text-muted-foreground">
          {labelContent}
        </figcaption>
      ) : null}
    </figure>
  );
}
