import React from 'react';
import QRCode from 'qrcode';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
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
  // Failure is tied to the exact inputs that failed and is cleared at render
  // time when inputs change, so the canvas mounts before the draw effect runs
  // (resetting inside the effect left the remounted canvas blank).
  const renderKey = `${valueStr}\u0000${size}\u0000${level}\u0000${foreground}\u0000${background}`;
  const [failedKey, setFailedKey] = React.useState<string | null>(null);
  const [lastRenderKey, setLastRenderKey] = React.useState(renderKey);
  if (lastRenderKey !== renderKey) {
    // any input change (including back to a previously failed value) retries
    setLastRenderKey(renderKey);
    setFailedKey(null);
  }
  const failed = failedKey === renderKey;

  // Render the QR matrix onto the canvas whenever inputs change.
  // AUDIT-13 exemption: QRCode.toCanvas has no AbortSignal support, so this
  // decoration/preview render uses a bare `cancelled` closure flag to suppress
  // stale result handling. The canvas draw is idempotent (a newer render simply
  // overwrites the stale frame), so there is no user-visible data-integrity
  // impact; only the error-state side effect is guarded.
  React.useEffect(() => {
    if (!canvasRef.current || valueStr.length === 0) {
      return;
    }
    const controller = new AbortController();
    QRCode.toCanvas(canvasRef.current, valueStr, {
      width: size,
      errorCorrectionLevel: level,
      margin: 1,
      color: { dark: foreground, light: background },
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setFailedKey(renderKey);
      void onLoadError?.();
      if (import.meta.env?.DEV === true) {
        console.warn('[qrcode] render failed:', error);
      }
    });
    return () => {
      controller.abort();
    };
  }, [valueStr, size, level, foreground, background, onLoadError, renderKey]);

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
          className={cn(
            'flex items-center justify-center rounded-md text-xs',
            // [G1-R2-视角5-01] failure is destructive-styled, distinct from the muted empty state.
            failed
              ? 'border border-destructive/40 bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {failed ? t('flux.common.loadFailed') : t('flux.common.noValue')}
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
        aria-label={typeof labelContent === 'string' ? labelContent : t('flux.qrcode.ariaLabel', { value: valueStr })}
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
