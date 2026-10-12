import { useId as useReactId, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { SendHorizontal, Square } from 'lucide-react';
import { Button, Textarea, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { buildDispatchCtx } from './dispatch-ctx.js';
import type { AiSenderExtensionProps, AiSenderSchema } from '../schemas.js';

/**
 * Word-limit counter shared by both input branches (WA-ai-004: the
 * extension-path and textarea-path blocks were hand-duplicated; overLimit
 * styling + aria-live live here now).
 */
function WordLimitCounter(props: { id: string; count: number; maxLength: number; overLimit: boolean }) {
  return (
    <span
      id={props.id}
      data-slot="ai-sender-count"
      aria-live="polite"
      className={cn(
        'absolute bottom-1 right-2 text-xs',
        props.overLimit ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {props.count}/{props.maxLength}
    </span>
  );
}

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

  // plan 529 Phase 1：textarea 自增高（内置 Textarea 路径；Tiptap extension 自管）。
  // 高度 = 内容高度，封顶 12rem 溢出滚动；提交/清空后随 draft 复位。IME 组合期
  // 仅高度计算、不改值，无重排抖动面。
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [draft]);

  const overLimit = typeof maxLength === 'number' && draft.length > maxLength;
  const senderCountId = useReactId();
  const trimmedLength = draft.trim().length;

  function commit(text: string) {
    // V12e 族1 (G5-视角3-01): text-gating — while a turn is streaming the
    // author can keep typing, but the commit channel stays gated (the
    // engine's isProcessing guard would silently swallow it). The draft is
    // kept intact; the send button communicates the gated state.
    if (disabled || loading) return;
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

  // plan 529 Phase 1：发送/停止同位切换——loading 时同一位置渲染 lucide Square
  // 停止钮（slot 语义保持 ai-sender-cancel，abortRequest 链路沿用）；空闲为
  // lucide SendHorizontal 图标发送钮。
  const actions = (
    <div data-slot="ai-sender-actions" className="flex items-center justify-end gap-2">
      {loading ? (
        <Button
          data-slot="ai-sender-cancel"
          size="icon"
          variant="destructive"
          aria-label={t('flux.ai.stop')}
          title={t('flux.ai.stop')}
          onClick={handleCancel}
          disabled={disabled}
        >
          <Square className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          data-slot="ai-sender-submit"
          size="icon"
          aria-label={t('flux.ai.send')}
          title={overLimit ? undefined : t('flux.ai.send')}
          onClick={handleSubmit}
          disabled={trimmedLength === 0 || overLimit || disabled}
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
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
            <WordLimitCounter id={senderCountId} count={draft.length} maxLength={maxLength} overLimit={overLimit} />
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
          aria-invalid={overLimit || undefined}
          aria-describedby={overLimit ? senderCountId : undefined}
          // V12e 族1 (G5-视角3-01) text-gating: the textarea stays enabled
          // while a turn streams (the author composes the next message); the
          // commit channel is gated instead. Only the node-level `disabled`
          // gate disables the input itself. The extension path keeps handing
          // `loading` to the extension component (its own contract).
          disabled={disabled}
          rows={1}
          maxLength={maxLength}
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);
            senderDraft?.setLocal(value);
            props.onChange?.(value);
          }}
          onKeyDown={handleKeyDown}
          className="max-h-48 min-h-[40px] resize-none overflow-y-auto"
        />
        {props.showWordLimit && typeof maxLength === 'number' ? (
          <WordLimitCounter id={senderCountId} count={draft.length} maxLength={maxLength} overLimit={overLimit} />
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
      disabled={props.meta.disabled === true}
      className={props.meta.className}
      testid={props.meta.testid}
      cid={props.meta.cid}
      extensionComponent={extensionComponent ?? null}
      onSubmit={(text) => {
        void ctx?.sendMessage(text);
        if (props.events.onSubmit) {
          const payload = { text };
          void props.events.onSubmit(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
        }
      }}
      onCancel={() => {
        void ctx?.abortRequest();
        if (props.events.onCancel) {
          const payload = {};
          void props.events.onCancel(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
        }
      }}
      onChange={(text) => {
        if (props.events.onChange) {
          const payload = { text };
          void props.events.onChange(payload, buildDispatchCtx(payload, props.node.scope as ScopeRef | undefined));
        }
      }}
    />
  );
}
