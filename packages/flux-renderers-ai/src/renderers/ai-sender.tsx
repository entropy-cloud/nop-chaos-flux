import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Textarea, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import type { AiSenderExtensionProps, AiSenderSchema } from '../schemas.js';

export interface AiSenderViewProps {
  placeholder?: string;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  maxLength?: number;
  showWordLimit?: boolean;
  clearOnSubmit?: boolean;
  className?: string;
  /** Override the loading state (defaults to engine.isProcessing). */
  loading?: boolean;
  /** When true (default), focus returns to the input after each submit. */
  refocusAfterSubmit?: boolean;
  /**
   * Optional host-injected rich-text extension component (P6/A6). When present,
   * the input area is delegated to this component (typically Tiptap from the
   * `./rich-text` subpath). When absent, the built-in `<Textarea>` is rendered
   * (zero-regression P0 behavior).
   */
  extensionComponent?: ComponentType<AiSenderExtensionProps> | null;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
  onChange?: (text: string) => void;
  testid?: string;
}

function shouldSubmit(event: KeyboardEvent<HTMLTextAreaElement>, mode: 'enter' | 'ctrlEnter' | 'shiftEnter'): boolean {
  // IME composition guard (O-3): while a CJK/Japanese/Korean input method is
  // composing, Enter confirms the candidate — it must NOT submit the message.
  // `keyCode === 229` is the legacy composition marker some browsers emit.
  if (event.nativeEvent.isComposing || event.keyCode === 229) return false;
  if (event.key !== 'Enter') return false;
  if (mode === 'enter') return !event.shiftKey;
  if (mode === 'ctrlEnter') return event.ctrlKey || event.metaKey;
  // shiftEnter
  return event.shiftKey;
}

/** Internal sender view — reads engine from ai-chat context. */
export function AiSenderView(props: AiSenderViewProps): React.ReactElement | null {
  const ctx = useAiChatContext();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const submitType = props.submitType ?? 'enter';
  const maxLength = props.maxLength;
  const clearOnSubmit = props.clearOnSubmit !== false;
  const refocusAfterSubmit = props.refocusAfterSubmit !== false;
  const loading = props.loading ?? ctx?.isProcessing ?? false;
  const ExtensionComponent = props.extensionComponent;

  const overLimit = typeof maxLength === 'number' && draft.length > maxLength;
  const trimmedLength = draft.trim().length;

  function commit(text: string) {
    if (props.onSubmit) props.onSubmit(text);
    else void ctx?.sendMessage(text);
    if (clearOnSubmit) setDraft('');
    // a11y: focus returns to the input so the user can immediately type the
    // next message (Phase 4 baseline; avoids the focus falling through to
    // the submit button or page body). Only applies to the Textarea path —
    // the extension component owns its own focus management.
    if (refocusAfterSubmit && !ExtensionComponent) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  function handleSubmit() {
    const text = draft.trim();
    if (text.length === 0 || overLimit) return;
    commit(text);
  }

  function handleCancel() {
    if (props.onCancel) props.onCancel();
    else void ctx?.abortRequest();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (shouldSubmit(event, submitType)) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const actions = (
    <div data-slot="ai-sender-actions" className="flex items-center justify-end gap-2">
      {loading ? (
        <Button data-slot="ai-sender-cancel" variant="outline" size="sm" onClick={handleCancel}>
          {t('flux.ai.stop')}
        </Button>
      ) : null}
      <Button
        data-slot="ai-sender-submit"
        size="sm"
        onClick={handleSubmit}
        disabled={loading || trimmedLength === 0 || overLimit}
      >
        {t('flux.ai.send')}
      </Button>
    </div>
  );

  if (ExtensionComponent) {
    return (
      <div className={cn('nop-ai-sender', props.className)} data-slot="ai-sender" data-extension="" data-testid={props.testid || undefined}>
        <div data-slot="ai-sender-input" className="relative">
          <ExtensionComponent
            value={draft}
            onChange={(text) => {
              setDraft(text);
              props.onChange?.(text);
            }}
            onSubmit={() => {
              const text = draft.trim();
              if (text.length === 0 || overLimit) return;
              commit(text);
            }}
            onCancel={handleCancel}
            loading={loading}
            placeholder={props.placeholder ?? t('flux.ai.placeholder')}
            maxLength={maxLength}
            showWordLimit={props.showWordLimit}
            submitType={submitType}
          />
          {props.showWordLimit && typeof maxLength === 'number' ? (
            <span
              data-slot="ai-sender-count"
              className={cn(
                'absolute bottom-1 right-2 text-xs',
                overLimit ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {draft.length}/{maxLength}
            </span>
          ) : null}
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className={cn('nop-ai-sender', props.className)} data-slot="ai-sender" data-testid={props.testid || undefined}>
      <div data-slot="ai-sender-input" className="relative">
        <Textarea
          ref={inputRef}
          value={draft}
          placeholder={props.placeholder ?? t('flux.ai.placeholder')}
          disabled={loading}
          rows={1}
          maxLength={maxLength}
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);
            props.onChange?.(value);
          }}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] resize-none"
        />
        {props.showWordLimit && typeof maxLength === 'number' ? (
          <span
            data-slot="ai-sender-count"
            className={cn(
              'absolute bottom-1 right-2 text-xs',
              overLimit ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {draft.length}/{maxLength}
          </span>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

/** Registered renderer: reads config from props, delegates to the sender view. */
export function AiSenderRenderer(props: RendererComponentProps<AiSenderSchema>): RendererRenderOutput {
  const resolved = props.props;
  const ctx = useAiChatContext();
  const extensionComponent = resolved.senderExtensions as
    | ComponentType<AiSenderExtensionProps>
    | undefined
    | null;

  return (
    <AiSenderView
      placeholder={resolved.placeholder}
      submitType={resolved.submitType}
      maxLength={resolved.maxLength}
      showWordLimit={resolved.showWordLimit}
      clearOnSubmit={resolved.clearOnSubmit}
      loading={resolved.loading as boolean | undefined}
      className={props.meta.className}
      testid={props.meta.testid}
      extensionComponent={extensionComponent ?? null}
      onSubmit={(text) => {
        void ctx?.sendMessage(text);
        if (props.events.onSubmit) {
          void props.events.onSubmit({ text });
        }
      }}
      onCancel={() => {
        void ctx?.abortRequest();
        if (props.events.onCancel) {
          void props.events.onCancel();
        }
      }}
      onChange={(text) => {
        if (props.events.onChange) {
          void props.events.onChange({ text });
        }
      }}
    />
  );
}
