import { useEffect, useRef } from 'react';
import { stringAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { cn, Textarea } from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';
import { useFormFieldController } from '../field-utils.js';
import type { TextareaSchema } from '../schemas.js';

const stringValueAdapter = stringAdapter();
const TEXTAREA_METHODS = ['clear', 'reset', 'focus'] as const;
const TEXTAREA_LINE_HEIGHT_FALLBACK_PX = 24;

function resolveTextareaLineHeightPx(el: HTMLElement): number {
  const computed = window.getComputedStyle(el);
  const lh = computed.lineHeight;
  if (lh && lh !== 'normal') {
    const px = parseFloat(lh);
    if (!Number.isNaN(px) && px > 0) {
      return px;
    }
  }
  const fs = parseFloat(computed.fontSize);
  if (!Number.isNaN(fs) && fs > 0) {
    return Math.round(fs * 1.5);
  }
  return TEXTAREA_LINE_HEIGHT_FALLBACK_PX;
}

export function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const textareaValue = (value as string | undefined) ?? '';
  const errorId = name ? `${name}-error` : undefined;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const initialValueRef = useRef<string>(textareaValue);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'textarea',
    cid: props.meta.cid,
    methods: TEXTAREA_METHODS,
    getFocusTarget: () => textareaRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(''),
    resetValue: () => {
      handlers.onChange(initialValueRef.current);
      return { fellBackToDefault: false };
    },
  });

  const rows = typeof props.props.rows === 'number' ? props.props.rows : 4;
  const minRows = typeof props.props.minRows === 'number' ? props.props.minRows : undefined;
  const maxRows = typeof props.props.maxRows === 'number' ? props.props.maxRows : undefined;
  const clearable = props.props.clearable === true;
  const trimContents = props.props.trimContents === true;
  const showCounter = props.props.showCounter === true;
  const maxLength = typeof props.props.maxLength === 'number' ? props.props.maxLength : undefined;

  const autoHeightEnabled = minRows !== undefined || maxRows !== undefined;

  useEffect(() => {
    if (!autoHeightEnabled) {
      return;
    }
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    const lineH = resolveTextareaLineHeightPx(el);
    const minPx = minRows !== undefined ? minRows * lineH : 0;
    const maxPx = maxRows !== undefined ? maxRows * lineH : Number.POSITIVE_INFINITY;
    el.style.height = 'auto';
    const scroll = el.scrollHeight;
    const clamped = Math.max(minPx, Math.min(scroll, maxPx));
    el.style.height = `${clamped}px`;
    el.style.overflowY = scroll > maxPx ? 'auto' : 'hidden';
  }, [textareaValue, autoHeightEnabled, minRows, maxRows]);

  const showClearButton =
    clearable &&
    presentation.interactive &&
    typeof textareaValue === 'string' &&
    textareaValue.length > 0;

  function handleBlur() {
    if (trimContents && typeof textareaValue === 'string' && textareaValue.length > 0) {
      const trimmed = textareaValue.trim();
      if (trimmed !== textareaValue) {
        handlers.onChange(trimmed);
      }
    }
    handlers.onBlur();
  }

  function handleClear() {
    handlers.onChange('');
  }

  const counterText =
    showCounter && typeof textareaValue === 'string'
      ? maxLength !== undefined
        ? `${textareaValue.length} / ${maxLength}`
        : `${textareaValue.length}`
      : undefined;

  const hasFooter = counterText !== undefined || clearable;

  const textareaEl = (
    <Textarea
      ref={textareaRef}
      id={name ? `${name}-control` : undefined}
      name={name || undefined}
      value={textareaValue}
      rows={rows}
      disabled={presentation.effectiveDisabled}
      readOnly={presentation.readOnly}
      aria-label={String((props.props.label ?? name) || '') || undefined}
      aria-required={props.props.required ? true : undefined}
      aria-invalid={presentation.showError ? true : undefined}
      aria-describedby={presentation.showError ? errorId : undefined}
      aria-errormessage={presentation.showError ? errorId : undefined}
      placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
      className={props.meta.className}
      onFocus={handlers.onFocus}
      onChange={(event) => handlers.onChange(event.target.value)}
      onBlur={handleBlur}
      maxLength={maxLength}
    />
  );

  if (!hasFooter) {
    return textareaEl;
  }

  return (
    <div className={cn('nop-textarea-wrapper', 'flex flex-col gap-1')} data-slot="textarea-wrapper">
      {textareaEl}
      <div className="flex items-center justify-end gap-2" data-slot="textarea-footer">
        {showClearButton ? (
          <button
            type="button"
            data-slot="textarea-clear"
            aria-label="Clear"
            className="inline-flex size-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            onClick={handleClear}
          >
            <XIcon className="pointer-events-none size-3.5" />
          </button>
        ) : null}
        {counterText !== undefined ? (
          <span data-slot="textarea-counter" className="text-xs text-muted-foreground tabular-nums">
            {counterText}
          </span>
        ) : null}
      </div>
    </div>
  );
}
