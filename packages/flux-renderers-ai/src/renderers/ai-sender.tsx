import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, Textarea, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import type { ActionContext, FluxActionEvent, ScopeRef } from '@nop-chaos/flux-core';
import type { AiSenderExtensionProps, AiSenderSchema } from '../schemas.js';

export interface AiSenderViewProps {
  placeholder?: string;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  maxLength?: number;
  showWordLimit?: boolean;
  clearOnSubmit?: boolean;
  className?: string;
  /**
   * P2-5 (2026-08-10 multi-audit): node-level `meta.disabled` control —
   * disables the input + actions (cross-package contract).
   */
  disabled?: boolean;
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
  cid?: number;
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
  // P2-5: node-level `meta.disabled` gates the whole interaction surface.
  const disabled = props.disabled === true;
  const ExtensionComponent = props.extensionComponent;
  // D4 (plan 2026-08-24-2317-1): per-chat draft channel. External writes
  // (component:setSenderDraft) notify here and merge into the local draft;
  // typing goes through `setLocal` write-through (no notification — prevents
  // a feedback loop) so `apply` computes appends on the real current value.
  const senderDraft = ctx?.senderDraft;
  useEffect(() => {
    if (!senderDraft) return;
    return senderDraft.subscribe(() => {
      setDraft(senderDraft.get());
    });
  }, [senderDraft]);

  const overLimit = typeof maxLength === 'number' && draft.length > maxLength;
  const trimmedLength = draft.trim().length;

  function commit(text: string) {
    if (disabled) return;
    // P2 silent-drop guard (FP `sender-commit-stream`): host `senderExtensions`
    // components are responsible for their own disabled state, but if they
    // don't gate on `loading` (or fire onSubmit imperatively), Enter-driven
    // commit would silently drop the draft — engine.runTurn's isProcessing
    // guard swallows the call. Mirror the user-edit guard: keep the draft
    // intact and bail out. The built-in Textarea submit button self-disables
    // (`disabled={loading || ...}`), so this is the host-extension path.
    if (ctx?.isProcessing) return;
    if (props.onSubmit) props.onSubmit(text);
    else void ctx?.sendMessage(text);
    if (clearOnSubmit) {
      setDraft('');
      // Keep the draft store base in sync — a stale non-empty base would
      // make a later external append compute on the submitted text.
      senderDraft?.setLocal('');
    }
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
    if (disabled) return;
    if (props.onCancel) props.onCancel();
    else void ctx?.abortRequest();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;
    if (shouldSubmit(event, submitType)) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const actions = (
    <div data-slot="ai-sender-actions" className="flex items-center justify-end gap-2">
      {loading ? (
        <Button data-slot="ai-sender-cancel" variant="outline" size="sm" onClick={handleCancel} disabled={disabled}>
          {t('flux.ai.stop')}
        </Button>
      ) : null}
      <Button
        data-slot="ai-sender-submit"
        size="sm"
        onClick={handleSubmit}
        disabled={loading || trimmedLength === 0 || overLimit || disabled}
      >
        {t('flux.ai.send')}
      </Button>
    </div>
  );

  if (ExtensionComponent) {
    return (
      <div className={cn('nop-ai-sender', props.className)} data-slot="ai-sender" data-extension="" data-cid={props.cid || undefined} data-testid={props.testid || undefined}>
        <div data-slot="ai-sender-input" className="relative">
          <ExtensionComponent
            value={draft}
            onChange={(text) => {
              setDraft(text);
              senderDraft?.setLocal(text);
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
            clearOnSubmit={clearOnSubmit}
            disabled={loading || disabled}
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
    <div className={cn('nop-ai-sender', props.className)} data-slot="ai-sender" data-cid={props.cid || undefined} data-testid={props.testid || undefined}>
      <div data-slot="ai-sender-input" className="relative">
        <Textarea
          ref={inputRef}
          value={draft}
          placeholder={props.placeholder ?? t('flux.ai.placeholder')}
          aria-label={props.placeholder ?? t('flux.ai.messageInput')}
          disabled={loading || disabled}
          rows={1}
          maxLength={maxLength}
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);
            senderDraft?.setLocal(value);
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

  // C8.1 P1 (bug 83 family convention): pass `{ event, evaluationBindings,
  // scope }` as the second dispatch arg so action-args templates can read the
  // payload keys (`${text}`) — the runtime resolves bindings + scope only.
  const dispatchCtx = (payload: Record<string, unknown>): Partial<ActionContext> => ({
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: props.node.scope as ScopeRef | undefined,
  });

  return (
    <AiSenderView
      placeholder={resolved.placeholder}
      submitType={resolved.submitType}
      maxLength={resolved.maxLength}
      showWordLimit={resolved.showWordLimit}
      clearOnSubmit={resolved.clearOnSubmit}
      loading={resolved.loading as boolean | undefined}
      disabled={props.meta.disabled === true}
      className={props.meta.className}
      testid={props.meta.testid}
      cid={props.meta.cid}
      extensionComponent={extensionComponent ?? null}
      onSubmit={(text) => {
        void ctx?.sendMessage(text);
        if (props.events.onSubmit) {
          const payload = { text };
          void props.events.onSubmit(payload, dispatchCtx(payload));
        }
      }}
      onCancel={() => {
        void ctx?.abortRequest();
        if (props.events.onCancel) {
          const payload = {};
          void props.events.onCancel(payload, dispatchCtx(payload));
        }
      }}
      onChange={(text) => {
        if (props.events.onChange) {
          const payload = { text };
          void props.events.onChange(payload, dispatchCtx(payload));
        }
      }}
    />
  );
}
