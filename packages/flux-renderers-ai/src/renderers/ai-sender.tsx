import { useState, type KeyboardEvent } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Textarea, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import type { AiSenderSchema } from '../schemas.js';

export interface AiSenderViewProps {
  placeholder?: string;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  maxLength?: number;
  showWordLimit?: boolean;
  clearOnSubmit?: boolean;
  className?: string;
  /** Override the loading state (defaults to engine.isProcessing). */
  loading?: boolean;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
  onChange?: (text: string) => void;
}

function shouldSubmit(event: KeyboardEvent<HTMLTextAreaElement>, mode: 'enter' | 'ctrlEnter' | 'shiftEnter'): boolean {
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
  const submitType = props.submitType ?? 'enter';
  const maxLength = props.maxLength;
  const clearOnSubmit = props.clearOnSubmit !== false;
  const loading = props.loading ?? ctx?.isProcessing ?? false;

  const overLimit = typeof maxLength === 'number' && draft.length > maxLength;

  function commit(text: string) {
    if (props.onSubmit) props.onSubmit(text);
    else void ctx?.sendMessage(text);
    if (clearOnSubmit) setDraft('');
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

  return (
    <div className={cn('nop-ai-sender', props.className)} data-slot="ai-sender">
      <div data-slot="ai-sender-input" className="relative">
        <Textarea
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
          disabled={loading || draft.trim().length === 0 || overLimit}
        >
          {t('flux.ai.send')}
        </Button>
      </div>
    </div>
  );
}

/** Registered renderer: reads config from props, delegates to the sender view. */
export function AiSenderRenderer(props: RendererComponentProps<AiSenderSchema>): RendererRenderOutput {
  const resolved = props.props;
  const ctx = useAiChatContext();

  return (
    <AiSenderView
      placeholder={resolved.placeholder}
      submitType={resolved.submitType}
      maxLength={resolved.maxLength}
      showWordLimit={resolved.showWordLimit}
      clearOnSubmit={resolved.clearOnSubmit}
      loading={resolved.loading as boolean | undefined}
      className={props.meta.className}
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
