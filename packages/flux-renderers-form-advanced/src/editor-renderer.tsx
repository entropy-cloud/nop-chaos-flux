import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Content } from '@tiptap/react';

const HTML_COMMIT_DEBOUNCE_MS = 300;
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extensions';
import type { Extensions } from '@tiptap/core';
import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { sanitizeHtml } from '@nop-chaos/flux-renderers-content';
/* Adjudication 01-04: form-advanced depends on content (sanitizeHtml), form (formFieldRules, useFormFieldController, etc.), and data (CrudColumnSchema/CrudSchema types). These are architecturally expected extension-package couplings. Accept-and-annotate: shared primitives live here by design; extraction would create an artificial shared package with no other consumers. */
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { formFieldRules, useFormFieldFromProps } from '@nop-chaos/flux-renderers-form';
import {
  DEFAULT_EDITOR_TOOLBAR,
  editorFieldRules,
  resolveToolbarButtons,
  type EditorSchema,
} from './editor-schemas.js';
import {
  isSafeLinkUrl,
  TOOLBAR_BUTTONS,
  TOOLBAR_ICONS,
  toolbarButtonTitle,
} from './editor-toolbar-config.js';

export { isSafeLinkUrl };

const EDITOR_METHODS = ['clear', 'focus'] as const;

const EDITOR_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the rich-text value to an empty string.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the rich-text editor.',
  },
] as const;

/**
 * Sanitize incoming HTML before handing it to ProseMirror (defense in depth on
 * top of ProseMirror's own allowlist). Reuses the W1a DOMPurify gate from
 * `flux-renderers-content` (editor design §11 / sanitize Failure Path).
 */
export function sanitizeEditorHtml(html: string): string {
  if (!html) {
    return '';
  }
  return sanitizeHtml(html);
}

/**
 * TipTap extension set for the editor renderer. The Link scheme allowlist
 * (protocols + validate) is passed through StarterKit's v3 `link` sub-config —
 * the previous separate `Link.configure` duplicated StarterKit's built-in Link
 * under the same name and triggered a runtime dedupe warning. This way
 * `javascript:`-class hrefs can never be created via the UI or paste — the
 * stored HTML value stays safe for hosts that echo it without re-sanitizing.
 *
 * `placeholder` (when the schema provides one) attaches the shared Placeholder
 * extension, which decorates the empty paragraph with `data-placeholder` +
 * `is-editor-empty` for the package CSS to render (see `styles.css`).
 *
 * Phase 3 (plan 480): Image (URL-prompt only; src guarded by
 * `isSafeImageUrl` — the upload channel is out of scope) and Highlight join
 * the schema so `<img>` / `<mark>` round-trip through load → serialize.
 */
export function buildEditorExtensions(placeholder?: string): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      link: {
        protocols: ['http', 'https', 'mailto', 'tel'],
        validate: isSafeLinkUrl,
        openOnClick: false,
        autolink: false,
      },
    }),
    Image,
    Highlight,
  ];
  if (placeholder) {
    extensions.push(Placeholder.configure({ placeholder }));
  }
  return extensions;
}

export function EditorRenderer(props: RendererComponentProps<EditorSchema>) {
  const name = String(props.props.name ?? '');
  const outputFormat = props.props.outputFormat === 'json' ? 'json' : 'html';
  const buttons = resolveToolbarButtons(props.props.toolbar);
  const placeholder =
    typeof props.props.placeholder === 'string' && props.props.placeholder
      ? props.props.placeholder
      : undefined;

  const { value, handlers, presentation } = useFormFieldFromProps(props);

  const readOnly = presentation.readOnly || !presentation.interactive;
  const handlersRef = useRef(handlers);
  const outputFormatRef = useRef(outputFormat);
  const htmlCommitTimerRef = useRef<number | undefined>(undefined);
  // V12b G2-R3-视角4-01: toolbar runs report an inline feedback token (e.g.
  // rejected link URL) instead of failing silently.
  const [toolbarFeedback, setToolbarFeedback] = useState<string | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  });
  useEffect(() => {
    outputFormatRef.current = outputFormat;
  });

  const editorAttributes: Record<string, string> = {
    class: 'nop-editor-content focus:outline-none',
    'data-testid': 'editor-content',
    'aria-label':
      String((props.props.label ?? name) || '') || t('flux.editor.richTextEditor'),
    'aria-multiline': 'true',
    role: 'textbox',
  };

  function readInitialContent(): Content {
    if (value === undefined || value === null || value === '') {
      return '';
    }
    if (outputFormat === 'json') {
      return value as Content;
    }
    return sanitizeEditorHtml(String(value));
  }

  const editor = useEditor(
    {
      extensions: buildEditorExtensions(placeholder),
      content: readInitialContent(),
      editable: !readOnly,
      immediatelyRender: true,
      editorProps: {
        attributes: editorAttributes,
      },
      onUpdate({ editor: activeEditor }) {
        const fmt = outputFormatRef.current;
        if (fmt === 'json') {
          const nextJson = activeEditor.getJSON();
          lastCommittedRef.current = nextJson;
          handlersRef.current.onChange(nextJson);
          return;
        }
        // HTML output passes the DOMPurify gate again (design §W3d: the editor
        // only ever emits the safe subset), so a pasted/typed link with an
        // unsafe scheme can never leak into the stored field value. The
        // serialize+sanitize pipeline is trailing-debounced — sanitize still
        // gates EVERY store write (no raw-HTML window); the editor itself
        // remains the interactive truth while typing.
        if (htmlCommitTimerRef.current !== undefined) {
          window.clearTimeout(htmlCommitTimerRef.current);
        }
        htmlCommitTimerRef.current = window.setTimeout(() => {
          htmlCommitTimerRef.current = undefined;
          const nextHtml = sanitizeEditorHtml(activeEditor.getHTML());
          lastCommittedRef.current = nextHtml;
          handlersRef.current.onChange(nextHtml);
        }, HTML_COMMIT_DEBOUNCE_MS);
      },
      onFocus() {
        handlersRef.current.onFocus();
      },
      onBlur() {
        handlersRef.current.onBlur();
        // [G2-R4-视角5-01] focus released — apply the external change that was
        // queued while the user was editing (emitUpdate:false keeps the applied
        // content out of the commit loop).
        const pending = pendingSyncRef.current;
        pendingSyncRef.current = null;
        if (pending && pending.value !== lastCommittedRef.current) {
          applyExternalValueRef.current(pending.value);
        }
      },
    },
    [],
  );

  // Track the last value committed to the field (initial value or via
  // onUpdate). Comparing against this — instead of re-reading editor.getHTML()
  // — avoids touching ProseMirror's lazily-built DOMSerializer before the view
  // is fully warmed up, and avoids clobbering the caret during active editing.
  const lastCommittedRef = useRef<unknown>(value);

  // [G2-R4-视角5-01] an external value change landing while the editor holds
  // focus is QUEUED here (never dropped) and applied on blur. A superseding
  // queue write keeps only the newest value — no stale commit.
  const pendingSyncRef = useRef<{ value: unknown } | null>(null);

  function applyExternalValue(next: unknown): void {
    if (!editor) {
      return;
    }
    const nextContent: Content =
      outputFormat === 'json'
        ? (next as Content)
        : sanitizeEditorHtml(String(next ?? ''));
    try {
      editor.commands.setContent(nextContent || '', { emitUpdate: false });
      lastCommittedRef.current = next;
    } catch {
      // Editor view not ready yet (e.g. mid-mount); the next external change
      // re-attempts the sync. The editor still initializes from `content`.
    }
  }
  // The once-created TipTap onBlur reads this mirror so it always calls the
  // latest render's apply routine (fresh outputFormat closure). The mirror is
  // refreshed in an effect — react-compiler forbids ref writes during render.
  const applyExternalValueRef = useRef(applyExternalValue);
  useEffect(() => {
    applyExternalValueRef.current = applyExternalValue;
  });

  // Sync external value changes (initial value / programmatic setValue) into the
  // editor without clobbering the user's caret during active editing.
  useEffect(() => {
    if (!editor) {
      return;
    }
    // [G2-R3-视角3-02] compare on the MERGED readOnly (schema readOnly OR
    // !interactive, e.g. a runtime `disabled` flip). The comparison must be
    // against the DESIRED editable state (!readOnly): the previous
    // `readOnly !== editor.isEditable` form was inverted — it re-fired on the
    // already-in-sync mount (true !== true vs false) and SKIPPED the actual
    // flip (readOnly=true, stale isEditable=true → equal → no call).
    if (editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly);
    }
    if (value === lastCommittedRef.current) {
      return;
    }
    if (editor.isFocused) {
      // [G2-R4-视角5-01] queue instead of dropping — applied on blur.
      pendingSyncRef.current = { value };
      return;
    }
    pendingSyncRef.current = null;
    applyExternalValueRef.current(value);
  }, [editor, value, outputFormat, readOnly]);

  useEffect(() => {
    return () => {
      if (htmlCommitTimerRef.current !== undefined) {
        window.clearTimeout(htmlCommitTimerRef.current);
        htmlCommitTimerRef.current = undefined;
        if (editor && !editor.isDestroyed) {
          const nextHtml = sanitizeEditorHtml(editor.getHTML());
          lastCommittedRef.current = nextHtml;
          handlersRef.current.onChange(nextHtml);
        }
      }
      editor?.destroy();
    };
  }, [editor]);



  useInputComponentHandle({
    id: props.id,
    name,
    type: 'editor',
    cid: props.meta.cid,
    methods: EDITOR_METHODS,
    getFocusTarget: () => editor?.view.dom ?? null,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => {
      editor?.commands.clearContent();
      handlersRef.current.onChange('');
    },
  });

  if (!editor) {
    return (
      <div
        className={cn('nop-editor', 'min-h-[80px] rounded-md border border-border bg-muted/30', props.meta.className)}
        data-slot="editor"
        data-loading=""
      />
    );
  }

  return (
    <div
      className={cn('nop-editor', 'flex flex-col gap-1.5', props.meta.className)}
      data-slot="editor"
      data-output-format={outputFormat}
      data-readonly={readOnly ? '' : undefined}
      data-invalid={presentation.showError ? '' : undefined}
    >
      {buttons && !readOnly ? (
        <div
          className="nop-editor-toolbar flex flex-wrap gap-1"
          data-slot="editor-toolbar"
        >
          {buttons.map((id) => {
            const config = TOOLBAR_BUTTONS[id];
            const Icon = TOOLBAR_ICONS[id];
            const active = config.isActive(editor);
            const disabled = !config.canRun(editor);
            const title = toolbarButtonTitle(id);
            return (
              <Button
                key={id}
                type="button"
                variant="ghost"
                size="sm"
                title={title}
                aria-label={title}
                aria-pressed={active ? true : undefined}
                data-testid={`editor-toolbar-${id}`}
                data-active={active ? '' : undefined}
                disabled={disabled}
                // Prevent focus theft so the editor keeps its caret/selection
                // when a formatting button is clicked (standard rich-text
                // toolbar pattern; otherwise toggleBold/etc. act on an empty
                // selection).
                onPointerDown={(event) => event.preventDefault()}
                onMouseDown={(event) => event.preventDefault()}
                className={cn(
                  'h-7 min-w-7 items-center justify-center border border-border px-1.5',
                  active && 'bg-accent text-accent-foreground',
                  disabled && 'opacity-40',
                )}
                onClick={() => {
                  setToolbarFeedback(
                    config.run(editor) === 'unsafe-link' ? t('flux.editor.unsafeLink') : null,
                  );
                }}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </div>
      ) : null}

      {toolbarFeedback ? (
        <p className="text-xs text-destructive" role="status" data-slot="editor-toolbar-feedback">
          {toolbarFeedback}
        </p>
      ) : null}

      <div className="rounded-md border border-input bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export const editorRendererDefinition: RendererDefinition = {
  type: 'editor',
  displayName: 'Editor',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: EditorRenderer,
  // Rich-text toolbar contains <button> controls: a <label> root would make
  // the first labelable descendant (the bold toolbar button) the label's
  // implicit control, so clicking the contenteditable forwards activation to
  // the toolbar button — toggling bold marks and stealing the first typed
  // keystrokes (w3d-editor:28 click+type race, adjudicated 2026-08-08).
  frameRootTag: 'div',
  fields: [...formFieldRules, ...editorFieldRules],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
  componentCapabilityContracts: EDITOR_CAPABILITY_CONTRACTS,
  wrap: true,
};

export { DEFAULT_EDITOR_TOOLBAR };
