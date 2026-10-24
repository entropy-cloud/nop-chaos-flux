import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ImageCompareSchema } from './schemas.js';

type Orientation = 'horizontal' | 'vertical';

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

function clampSeed(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return clampPercent(parsed);
}

function stepForKey(event: React.KeyboardEvent<HTMLElement>): number {
  if (event.key === 'Home') return -Infinity;
  if (event.key === 'End') return Infinity;
  if (event.key === 'PageUp') return 10;
  if (event.key === 'PageDown') return -10;
  return 1;
}

interface SideImageState {
  loaded: boolean;
  errored: boolean;
}

function SideImage(props: {
  src: unknown;
  alt: string;
  slot: 'image-compare-before' | 'image-compare-after';
  className?: string;
  style?: React.CSSProperties;
}) {
  const src = typeof props.src === 'string' && props.src ? props.src : '';
  const [state, setState] = React.useState<SideImageState>({ loaded: false, errored: false });

  if (!src || state.errored) {
    return (
      <div
        data-slot={props.slot}
        data-state="error"
        className={cn(props.className, 'flex items-center justify-center bg-muted text-xs text-muted-foreground')}
      >
        <span data-slot="image-compare-error">{props.alt || t('flux.common.noData')}</span>
      </div>
    );
  }

  return (
    <img
      data-slot={props.slot}
      data-state={state.loaded ? 'loaded' : 'loading'}
      src={src}
      alt={props.alt}
      draggable={false}
      className={cn(props.className, !state.loaded && 'bg-muted')}
      style={props.style}
      onLoad={() => setState({ loaded: true, errored: false })}
      onError={() => setState({ loaded: false, errored: true })}
    />
  );
}

export function ImageCompareRenderer(props: RendererComponentProps<ImageCompareSchema>) {
  const schemaProps = props.props;
  const orientation: Orientation = schemaProps.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const alt = String(schemaProps.alt ?? '');
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState<number>(() => clampSeed(schemaProps.defaultPosition ?? 50));

  // Plain function (React19-first: Compiler handles memoization; the useCallback
  // form was flagged by find-react19-optimization-candidates as redundant).
  const positionFromClient = (clientX: number, clientY: number): number => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return position;
    const ratio =
      orientation === 'horizontal'
        ? (clientX - rect.left) / rect.width
        : (clientY - rect.top) / rect.height;
    return clampPercent(Math.round(ratio * 100));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPosition(positionFromClient(event.clientX, event.clientY));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons % 2 === 0 || !event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    setPosition(positionFromClient(event.clientX, event.clientY));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowUp';
    const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowDown';
    if (event.key === forward) next = position + stepForKey(event);
    else if (event.key === back) next = position - stepForKey(event);
    else if (event.key === 'PageUp') next = position + 10;
    else if (event.key === 'PageDown') next = position - 10;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    setPosition(clampPercent(next));
  };

  const dividerOffset = `${position}%`;
  const clipPath =
    orientation === 'horizontal'
      ? `inset(0 ${100 - position}% 0 0)`
      : `inset(0 0 ${100 - position}% 0)`;

  return (
    <div
      ref={containerRef}
      className={cn('nop-image-compare relative overflow-hidden select-none', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-slot="image-compare-root"
      data-orientation={orientation}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <SideImage
        src={schemaProps.after}
        alt={alt}
        slot="image-compare-after"
        className="block h-auto w-full object-contain"
      />
      <SideImage
        src={schemaProps.before}
        alt={alt}
        slot="image-compare-before"
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath }}
      />
      <div
        data-slot="image-compare-divider"
        className={cn(
          'absolute bg-border',
          orientation === 'horizontal'
            ? 'inset-y-0 w-px'
            : 'inset-x-0 h-px',
        )}
        style={orientation === 'horizontal' ? { left: dividerOffset } : { top: dividerOffset }}
      >
        <div
          data-slot="image-compare-handle"
          role="slider"
          tabIndex={0}
          aria-label={alt ? `${alt} divider` : 'Compare divider'}
          aria-orientation={orientation}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={position}
          onKeyDown={onKeyDown}
          className={cn(
            'absolute flex items-center justify-center rounded-full border bg-background text-foreground shadow-sm',
            orientation === 'horizontal'
              ? 'left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize'
              : 'left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
          )}
        />
      </div>
    </div>
  );
}
