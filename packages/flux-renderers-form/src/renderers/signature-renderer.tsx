import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { stringAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useFormFieldFromProps } from '../field-utils.js';
import type { InputSignatureSchema } from '../schemas-signature.js';

interface StrokePoint {
  x: number;
  y: number;
}

const STRING_ADAPTER = stringAdapter();
const SIGNATURE_METHODS = ['clear', 'reset'] as const;
const DEFAULT_PEN_COLOR = '#1f2937';
const DEFAULT_PEN_WIDTH = 2;
const DEFAULT_HEIGHT = 160;

/**
 * Handwritten signature field (missing-components L2.3, plan 507). Pointer-
 * event canvas with per-stroke undo; the value is the canvas bitmap as a PNG
 * data URL, and the zero-stroke state is always `undefined` (plan 507 值语义
 * 不变式). Bitmap geometry = container CSS width × `height` × devicePixelRatio
 * with CSS→bitmap coordinate scaling on input.
 */
export function InputSignatureRenderer(props: RendererComponentProps<InputSignatureSchema>) {
  const name = String(props.props.name ?? '');
  const penColor = typeof props.props.penColor === 'string' ? props.props.penColor : DEFAULT_PEN_COLOR;
  const penWidth = typeof props.props.penWidth === 'number' && props.props.penWidth > 0 ? props.props.penWidth : DEFAULT_PEN_WIDTH;
  const height = typeof props.props.height === 'number' && props.props.height > 0 ? props.props.height : DEFAULT_HEIGHT;
  const backgroundColor = typeof props.props.backgroundColor === 'string' ? props.props.backgroundColor : '#ffffff';
  const clearable = props.props.clearable !== false;

  const { value, handlers, presentation } = useFormFieldFromProps(props, {
    adapter: STRING_ADAPTER,
  });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<StrokePoint[][]>([]);
  const drawingRef = useRef(false);
  const lastCommittedRef = useRef<string | undefined>(undefined);
  const [hasContext, setHasContext] = useState(false);
  const interactiveRef = useRef(true);
  useEffect(() => {
    interactiveRef.current = presentation.interactive;
  }, [presentation.interactive]);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    const strokes = strokesRef.current;
    const next = strokes.length === 0 ? undefined : (canvas?.toDataURL('image/png') ?? undefined);
    lastCommittedRef.current = next;
    handlers.onChange(next);
  }, [handlers]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
      return;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr(), dpr());
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) {
        continue;
      }
      if (stroke.length === 1) {
        // A tap is a dot: degenerate zero-length segments render nothing.
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, penWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = penColor;
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, [penColor, penWidth]);

  // Canvas sizing runs once: a later re-run would re-assign canvas.width and
  // wipe committed ink (the ref-held strokes would no longer match the bitmap).
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      startTransition(() => setHasContext(false));
      return;
    }
    initializedRef.current = true;
    startTransition(() => setHasContext(true));
    const width = wrapperRef.current?.clientWidth ?? 320;
    canvas.width = Math.max(1, Math.floor(width * dpr()));
    canvas.height = Math.max(1, Math.floor(height * dpr()));
    redraw();
  }, [height, redraw]);

  // External value (form init / cross-page restore): decode and echo onto the
  // canvas. Our own commits are recognized and skipped. Invalid data URLs hit
  // onerror → blank canvas, value preserved (plan 507 signature-invalid-echo).
  useEffect(() => {
    // stringAdapter reads an unset form value as '' — only a non-empty,
    // externally-supplied dataURL triggers the echo draw.
    if (!value || value === lastCommittedRef.current) {
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) {
        return;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
      strokesRef.current = [];
    };
    image.onerror = () => {
      /* keep the raw value echoed on the trigger; canvas stays blank */
    };
    image.src = String(value);
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContext) {
      return;
    }
    const pointerPos = (event: PointerEvent): StrokePoint => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!interactiveRef.current) {
        return;
      }
      // Canceling pointerdown suppresses the compatibility mouse/click
      // synthesis, so a stroke-finish layout shift can never drop a stray
      // click onto the toolbar buttons under the pointer.
      event.preventDefault();
      drawingRef.current = true;
      strokesRef.current.push([pointerPos(event)]);
      redraw();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drawingRef.current) {
        return;
      }
      const stroke = strokesRef.current[strokesRef.current.length - 1];
      if (!stroke) {
        return;
      }
      stroke.push(pointerPos(event));
      redraw();
    };
    const finishStroke = () => {
      if (!drawingRef.current) {
        return;
      }
      drawingRef.current = false;
      redraw();
      commit();
      // A stroke-finish layout shift can drop the browser's synthesized click
      // onto a toolbar button that scrolled under the pointer — swallow it.
      const swallow = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
      };
      document.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 400);
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
    canvas.addEventListener('pointerleave', finishStroke);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', finishStroke);
      canvas.removeEventListener('pointercancel', finishStroke);
      canvas.removeEventListener('pointerleave', finishStroke);
    };
  }, [commit, hasContext, redraw]);

  const undo = () => {
    if (!presentation.interactive || !hasContext) {
      return;
    }
    strokesRef.current.pop();
    redraw();
    commit();
  };

  const clear = () => {
    if (!presentation.interactive) {
      return;
    }
    strokesRef.current = [];
    redraw();
    commit();
  };

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'input-signature',
    cid: props.meta.cid,
    methods: SIGNATURE_METHODS,
    getFocusTarget: () => canvasRef.current ?? wrapperRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => {
      strokesRef.current = [];
      redraw();
      commit();
    },
    resetValue: () => {
      handlers.onChange(value);
      return { fellBackToDefault: false };
    },
  });

  const disabled = !presentation.interactive;

  return (
    <div
      ref={wrapperRef}
      className={cn('nop-input-signature-field', props.meta.className)}
      data-invalid={presentation.showError ? true : undefined}
      data-unsupported={!hasContext ? true : undefined}
    >
      <div className="relative inline-block w-full" data-slot="signature-canvas-wrap">
        <canvas
          ref={canvasRef}
          data-slot="signature-canvas"
          data-testid={props.meta.testid}
          aria-label={String(props.props.label ?? name) || t('flux.form.signatureAriaLabel')}
          className="block w-full cursor-crosshair rounded-md border border-input touch-none"
          style={{ height, backgroundColor }}
        />
        {!hasContext ? (
          <div
            className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
            data-slot="signature-unsupported"
          >
            {t('flux.form.signatureUnsupported')}
          </div>
        ) : null}
        {presentation.readOnly && hasContext ? (
          <div className="absolute inset-0" data-slot="signature-readonly-overlay" />
        ) : null}
      </div>
      {hasContext ? (
        <div className="mt-1 flex items-center gap-1" data-slot="signature-toolbar">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-slot="signature-undo"
            disabled={disabled}
            onClick={undo}
          >
            {t('flux.form.signatureUndo')}
          </Button>
          {clearable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-slot="signature-clear"
              disabled={disabled}
              onClick={clear}
            >
              {t('flux.form.signatureClear')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function dpr(): number {
  return typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
}
