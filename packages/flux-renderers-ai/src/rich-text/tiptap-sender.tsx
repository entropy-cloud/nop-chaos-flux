// ============================================
// Tiptap-backed ai-sender editor (P6 / A6)
// ============================================
//
// Host-injected rich-text editor for `ai-sender`. Lives behind the opt-in
// `./rich-text` subpath so hosts that never import it pay zero Tiptap cost.
// The editor serializes its content to plain text (`editor.getText()`) before
// emitting `onChange`/`onSubmit` — the message-engine contract
// (`sendMessage(text: string)`) is unchanged.
//
// Phase 2: StarterKit-only editor + plain-text serialization + Enter submit
// keymap + loading(disabled) + placeholder.
// Phase 3: built-in @mention / template / slash-command popups layered on
// top (`./extensions/*`), driven by `TiptapSenderOptions.extensions`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { AiSenderExtensionProps } from '../schemas.js';
import type {
  TiptapSenderOptions,
  TiptapTemplateItem,
} from './types.js';
import {
  detectMentionQuery,
  filterMentions,
  insertMention,
  MENTION_TRIGGER,
} from './extensions/mention.js';
import { insertTemplate } from './extensions/template.js';
import {
  detectSlashQuery,
  filterSlashCommands,
  runSlashCommand,
} from './extensions/slash-command.js';

type SubmitMode = 'enter' | 'ctrlEnter' | 'shiftEnter';

/**
 * Mutable callbacks container (stable identity across renders, updated by an
 * effect). The Tiptap editor is built once and its keymap reads the freshest
 * submit type + handlers from this container — mirrors the `handlersRef`
 * pattern in `editor-renderer.tsx` (ref reads live inside deferred Tiptap
 * callbacks, never during render).
 */
interface SenderCallbacks {
  onSubmit: () => void;
  onChange: (text: string) => void;
  submitMode: SubmitMode;
}

export interface TiptapSenderComponentProps extends AiSenderExtensionProps {
  options: TiptapSenderOptions;
}

/**
 * Concrete Tiptap editor. Receives `options` (factory-time configuration) plus
 * `AiSenderExtensionProps` (per-render context from `ai-sender`). Emits plain
 * text on every content change and on submit.
 *
 * The `value` prop is treated as the initial content only — once mounted, the
 * editor owns its content (mirror of `editor-renderer.tsx`). Receiving a new
 * `value` from the parent (e.g. `clearOnSubmit`) clears the editor when the
 * parent signals an empty string and the editor is not focused.
 */
export function TiptapSender(props: TiptapSenderComponentProps): React.ReactElement | null {
  const { options, value, onChange, onSubmit, submitType, placeholder, loading, disabled } = props;

  // Which built-in extensions are enabled (Phase 3)?
  const enabledExtensions = options.extensions ?? [];
  const mentionEnabled = enabledExtensions.includes('mention');
  const templateEnabled = enabledExtensions.includes('template');
  const slashEnabled = enabledExtensions.includes('slash');
  // Memoize data sources so the popupItems useMemo deps stay stable.
  const mentions = useMemo(() => options.mentions ?? [], [options.mentions]);
  const templates = useMemo(() => options.templates ?? [], [options.templates]);
  const slashCommands = useMemo(() => options.slashCommands ?? [], [options.slashCommands]);

  // Active popup state: when non-null, a trigger popup is shown. Tracked in a
  // ref so the editor's `handleKeyDown` (registered once) can intercept
  // Arrow/Enter navigation keys while the popup is open (and let the Tiptap
  // submit keymap pass through when it is closed).
  const [popupState, setPopupState] = useState<PopupState>({ kind: 'none' });
  const popupStateRef = useRef<PopupState>(popupState);
  useEffect(() => {
    popupStateRef.current = popupState;
  });

  // Popup navigation control (set from the React layer; consumed by the
  // editor's handleKeyDown to move the active item / confirm / close).
  const popupControlsRef = useRef<PopupControls>({ move: () => {}, confirm: () => {}, close: () => {} });

  // Stable mutable callbacks container (mirrors `handlersRef` in
  // `editor-renderer.tsx`). The Tiptap editor is built once and its keymap +
  // onUpdate read the freshest values from here. The container itself is
  // stable (created once via useRef), and `.current` is only ever read inside
  // deferred Tiptap callbacks — never during render.
  const callbacksRef = useRef<SenderCallbacks>({
    onSubmit,
    onChange,
    submitMode: submitType ?? 'enter',
  });
  useEffect(() => {
    callbacksRef.current.onSubmit = onSubmit;
    callbacksRef.current.onChange = onChange;
    callbacksRef.current.submitMode = submitType ?? 'enter';
  });

  // Shared extra extensions (host-supplied). Memoized so the identity is stable
  // across renders and useEditor doesn't rebuild needlessly.
  const extraExtensions = options.extraExtensions ?? null;

  // Tracks the last text we emitted via onChange so we don't loop on
  // programmatic setContent that fires onUpdate with identical text.
  const lastEmittedRef = useRef<string>(value);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        // Custom keymap: maps Enter/Ctrl+Enter/Shift+Enter to submit per the
        // ai-sender `submitType` mode. Reads the latest mode + handler from
        // `callbacksRef.current` (deferred — only invoked on keyboard events).
        Extension.create({
          name: 'aiSenderSubmitKeymap',
          priority: 1000, // Higher than StarterKit's hardBreak Enter binding.
          addKeyboardShortcuts() {
            return {
              Enter: ({ editor }) => {
                const mode = callbacksRef.current.submitMode;
                if (mode === 'enter') {
                  callbacksRef.current.onSubmit();
                  return true;
                }
                if (mode === 'ctrlEnter') {
                  editor.commands.setHardBreak();
                  return true;
                }
                // shiftEnter: plain Enter inserts a newline (default hardBreak).
                return false;
              },
              'Shift-Enter': ({ editor }) => {
                if (callbacksRef.current.submitMode === 'shiftEnter') {
                  callbacksRef.current.onSubmit();
                  return true;
                }
                editor.commands.setHardBreak();
                return true;
              },
              'Mod-Enter': () => {
                if (callbacksRef.current.submitMode === 'ctrlEnter') {
                  callbacksRef.current.onSubmit();
                  return true;
                }
                return false;
              },
            };
          },
        }),
        ...(extraExtensions ?? []),
      ],
      content: value ?? '',
      editable: !(disabled || loading),
      immediatelyRender: true,
      editorProps: {
        attributes: {
          class: 'nop-ai-sender-tiptap-content prose max-w-none focus:outline-none',
          'data-slot': 'ai-sender-tiptap-content',
          'data-placeholder': placeholder ?? t('flux.ai.placeholder'),
          'aria-label': placeholder ?? t('flux.ai.placeholder'),
          'aria-multiline': 'true',
          role: 'textbox',
        },
        // Intercept Arrow/Enter/Escape when a popup is open so the user can
        // navigate the suggestion list without the editor stealing the keys.
        // This handler is registered once; it reads `popupStateRef.current`
        // + `popupControlsRef.current` (deferred — only runs on key events).
        handleKeyDown(_view, event) {
          const state = popupStateRef.current;
          if (state.kind === 'none') return false;
          const ctrl = popupControlsRef.current;
          if (event.key === 'ArrowDown') {
            ctrl.move(1);
            return true;
          }
          if (event.key === 'ArrowUp') {
            ctrl.move(-1);
            return true;
          }
          if (event.key === 'Enter') {
            ctrl.confirm();
            return true;
          }
          if (event.key === 'Escape') {
            ctrl.close();
            return true;
          }
          return false;
        },
      },
      onUpdate({ editor: active }) {
        const text = active.getText();
        lastEmittedRef.current = text;
        callbacksRef.current.onChange(text);
      },
      onSelectionUpdate({ editor: active }) {
        // Phase 3: detect trigger characters at the new caret position.
        const current = popupStateRef.current;
        if (current.kind === 'none') {
          if (mentionEnabled && mentions.length > 0) {
            const q = detectMentionQuery(active);
            if (q) {
              setPopupState({ kind: 'mention', query: q.query, from: q.from, to: q.to, activeIndex: 0 });
              return;
            }
          }
          if (slashEnabled && slashCommands.length > 0) {
            const q = detectSlashQuery(active);
            if (q) {
              setPopupState({ kind: 'slash', query: q.query, from: q.from, to: q.to, activeIndex: 0 });
              return;
            }
          }
        }
        // If a popup is open, refresh the query from the caret; close if the
        // trigger char was deleted.
        if (current.kind === 'mention') {
          const q = detectMentionQuery(active);
          if (!q) setPopupState({ kind: 'none' });
          else if (q.query !== current.query) {
            setPopupState({ kind: 'mention', query: q.query, from: q.from, to: q.to, activeIndex: 0 });
          }
        } else if (current.kind === 'slash') {
          const q = detectSlashQuery(active);
          if (!q) setPopupState({ kind: 'none' });
          else if (q.query !== current.query) {
            setPopupState({ kind: 'slash', query: q.query, from: q.from, to: q.to, activeIndex: 0 });
          }
        }
      },
    },
    // Rebuild only when the host-supplied extra extensions identity changes.
    [extraExtensions],
  );

  // Reflect latest loading/disabled state without rebuilding the editor.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!(disabled || loading));
  }, [editor, disabled, loading]);

  // Notify the host once the editor instance is ready (imperative integration
  // hook + test seam). `options` is captured once by `createTiptapSender`, so
  // `options.onReady` is stable across renders → this fires once per editor.
  const onReady = options.onReady;
  useEffect(() => {
    if (!editor) return;
    onReady?.(editor);
  }, [editor, onReady]);

  // External clear: parent reset `value` to '' while editor is not focused
  // (mirrors `clearOnSubmit` semantics from `ai-sender`).
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    if (editor.isFocused) return;
    try {
      editor.commands.setContent(value ?? '', { emitUpdate: false });
      lastEmittedRef.current = value ?? '';
    } catch {
      // Editor view not ready; next external change re-attempts sync.
    }
  }, [editor, value]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // Close the popup when the data source is empty (extension-data-missing
  // Failure Path): handled in the render guard below — when popupItems is
  // empty the popup is not rendered, and the editor's handleKeyDown returns
  // false (lets keys pass through) because popupItems.length === 0.

  // Compute the filtered items for the active popup. Memoized so the
  // popupControlsRef effect doesn't re-run every render.
  const popupItems = useMemo<PopupItem[]>(() => {
    if (popupState.kind === 'mention') {
      return filterMentions(mentions, popupState.query).map((m) => ({
        key: m.id,
        label: `${MENTION_TRIGGER}${m.label}`,
        onSelect: () => {
          if (editor) {
            insertMention(editor, m, { from: popupState.from, to: popupState.to });
          }
          setPopupState({ kind: 'none' });
        },
      }));
    }
    if (popupState.kind === 'slash') {
      return filterSlashCommands(slashCommands, popupState.query).map((c) => ({
        key: c.label,
        label: c.label,
        onSelect: () => {
          if (editor) {
            runSlashCommand(editor, c, { from: popupState.from, to: popupState.to });
          }
          setPopupState({ kind: 'none' });
        },
      }));
    }
    return [];
  }, [popupState, mentions, slashCommands, editor]);

  // Keep popupControlsRef fresh so the editor's handleKeyDown calls the
  // latest navigation handlers. Updated in an effect (not during render).
  useEffect(() => {
    popupControlsRef.current = {
      move(delta) {
        if (popupItems.length === 0) return;
        const current = popupStateRef.current;
        const idx = current.kind === 'none' ? -1 : current.activeIndex;
        const next = (idx + delta + popupItems.length) % popupItems.length;
        if (current.kind === 'mention') {
          setPopupState({ ...current, activeIndex: next });
        } else if (current.kind === 'slash') {
          setPopupState({ ...current, activeIndex: next });
        }
      },
      confirm() {
        const current = popupStateRef.current;
        const idx = current.kind === 'none' ? -1 : current.activeIndex;
        if (idx >= 0 && idx < popupItems.length) {
          popupItems[idx].onSelect();
        }
      },
      close() {
        setPopupState({ kind: 'none' });
      },
    };
  }, [popupItems]);

  return (
    <div className={cn('nop-ai-sender-tiptap-wrapper')} data-slot="ai-sender-tiptap-wrapper">
      {templateEnabled && templates.length > 0 ? (
        <TemplateBar templates={templates} editor={editor} />
      ) : null}
      <TiptapSenderSurface editor={editor} />
      {popupState.kind !== 'none' && popupItems.length > 0 ? (
        <SuggestionPopup
          kind={popupState.kind}
          items={popupItems}
          activeIndex={popupState.activeIndex}
          onSelect={(idx) => popupItems[idx]?.onSelect()}
          onClose={() => setPopupState({ kind: 'none' })}
        />
      ) : null}
    </div>
  );
}

// ---- Phase 3 popup types ----

type PopupState =
  | { kind: 'none' }
  | { kind: 'mention'; query: string; from: number; to: number; activeIndex: number }
  | { kind: 'slash'; query: string; from: number; to: number; activeIndex: number };

interface PopupItem {
  key: string;
  label: string;
  onSelect: () => void;
}

interface PopupControls {
  move: (delta: number) => void;
  confirm: () => void;
  close: () => void;
}

/**
 * Template insertion toolbar — renders one button per `TiptapTemplateItem`.
 * Clicking inserts the template's `content` at the caret.
 */
function TemplateBar({
  templates,
  editor,
}: {
  templates: TiptapTemplateItem[];
  editor: Editor | null;
}): React.ReactElement {
  return (
    <div
      className="nop-ai-sender-tiptap-templates flex flex-wrap gap-1 pb-1"
      data-slot="ai-sender-tiptap-templates"
      role="toolbar"
      aria-label="Insert template"
    >
      {templates.map((tpl) => (
        <Button
          key={tpl.label}
          type="button"
          variant="ghost"
          size="sm"
          data-testid={`ai-sender-template-${tpl.label}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertTemplate(editor, tpl)}
          className="h-6 text-xs"
        >
          {tpl.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * Suggestion popup (shared by @mention + slash). Renders a filtered list of
 * items anchored below the editor surface. Keyboard navigation is handled by
 * the editor's `handleKeyDown` (which calls the popup controls); clicking an
 * item selects it directly.
 */
function SuggestionPopup({
  kind,
  items,
  activeIndex,
  onSelect,
  onClose,
}: {
  kind: 'mention' | 'slash';
  items: PopupItem[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'nop-ai-sender-tiptap-popup absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
      )}
      data-slot="ai-sender-tiptap-popup"
      data-popup-kind={kind}
      role="listbox"
      aria-label={kind === 'mention' ? 'Mentions' : 'Slash commands'}
    >
      {items.map((item, idx) => (
        <Button
          key={item.key}
          type="button"
          variant="ghost"
          size="sm"
          role="option"
          aria-selected={idx === activeIndex}
          data-active={idx === activeIndex ? '' : undefined}
          onMouseEnter={() => onSelect(idx)}
          onClick={() => onSelect(idx)}
          className={cn('h-7 w-full justify-start text-xs', idx === activeIndex && 'bg-accent text-accent-foreground')}
        >
          {item.label}
        </Button>
      ))}
      <button
        type="button"
        aria-label="Close suggestions"
        onClick={onClose}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

/**
 * Thin presentational wrapper around `EditorContent`.
 */
function TiptapSenderSurface({ editor }: { editor: Editor | null }): React.ReactElement {
  if (!editor) {
    return (
      <div
        className="nop-ai-sender-tiptap min-h-[40px] rounded-md border border-input bg-background"
        data-slot="ai-sender-tiptap"
        data-loading=""
        aria-busy="true"
      />
    );
  }
  return (
    <div
      className="nop-ai-sender-tiptap rounded-md border border-input bg-background"
      data-slot="ai-sender-tiptap"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
