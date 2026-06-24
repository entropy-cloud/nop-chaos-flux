import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  Undo2Icon,
} from 'lucide-react';
import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { sanitizeHtml } from '@nop-chaos/flux-renderers-content';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { formFieldRules, useFormFieldController } from '@nop-chaos/flux-renderers-form';
import {
  DEFAULT_EDITOR_TOOLBAR,
  editorFieldRules,
  resolveToolbarButtons,
  type EditorSchema,
  type EditorToolbarButton,
} from './editor-schemas.js';

const EDITOR_METHODS = ['clear', 'focus'] as const;

interface ToolbarButtonConfig {
  id: EditorToolbarButton;
  label: string;
  title: string;
  isActive: (editor: NonNullable<ReturnType<typeof useEditor>>) => boolean;
  run: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
  canRun: (editor: NonNullable<ReturnType<typeof useEditor>>) => boolean;
}

const TOOLBAR_BUTTONS: Record<EditorToolbarButton, ToolbarButtonConfig> = {
  bold: {
    id: 'bold',
    label: 'B',
    title: 'Bold',
    isActive: (e) => e.isActive('bold'),
    canRun: (e) => e.can().toggleBold(),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  italic: {
    id: 'italic',
    label: 'I',
    title: 'Italic',
    isActive: (e) => e.isActive('italic'),
    canRun: (e) => e.can().toggleItalic(),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  strike: {
    id: 'strike',
    label: 'S',
    title: 'Strikethrough',
    isActive: (e) => e.isActive('strike'),
    canRun: (e) => e.can().toggleStrike(),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  h1: {
    id: 'h1',
    label: 'H1',
    title: 'Heading 1',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    canRun: (e) => e.can().toggleHeading({ level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  h2: {
    id: 'h2',
    label: 'H2',
    title: 'Heading 2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    canRun: (e) => e.can().toggleHeading({ level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  bulletList: {
    id: 'bulletList',
    label: '•',
    title: 'Bullet list',
    isActive: (e) => e.isActive('bulletList'),
    canRun: (e) => e.can().toggleBulletList(),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  orderedList: {
    id: 'orderedList',
    label: '1.',
    title: 'Ordered list',
    isActive: (e) => e.isActive('orderedList'),
    canRun: (e) => e.can().toggleOrderedList(),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  code: {
    id: 'code',
    label: '</>',
    title: 'Inline code',
    isActive: (e) => e.isActive('code'),
    canRun: (e) => e.can().toggleCode(),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  blockquote: {
    id: 'blockquote',
    label: '“”',
    title: 'Block quote',
    isActive: (e) => e.isActive('blockquote'),
    canRun: (e) => e.can().toggleBlockquote(),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  link: {
    id: 'link',
    label: '🔗',
    title: 'Link',
    isActive: (e) => e.isActive('link'),
    canRun: () => true,
    run: (e) => {
      const url = typeof window !== 'undefined' ? window.prompt('URL') : null;
      if (url) {
        e.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      } else {
        e.chain().focus().extendMarkRange('link').unsetLink().run();
      }
    },
  },
  undo: {
    id: 'undo',
    label: '',
    title: 'Undo',
    isActive: () => false,
    canRun: (e) => e.can().undo(),
    run: (e) => e.chain().focus().undo().run(),
  },
  redo: {
    id: 'redo',
    label: '',
    title: 'Redo',
    isActive: () => false,
    canRun: (e) => e.can().redo(),
    run: (e) => e.chain().focus().redo().run(),
  },
};

const TOOLBAR_ICONS: Partial<Record<EditorToolbarButton, typeof BoldIcon>> = {
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
  blockquote: QuoteIcon,
  code: CodeIcon,
  link: LinkIcon,
  bold: BoldIcon,
  italic: ItalicIcon,
  strike: StrikethroughIcon,
  h1: Heading1Icon,
  h2: Heading2Icon,
  undo: Undo2Icon,
  redo: Redo2Icon,
};

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

export function EditorRenderer(props: RendererComponentProps<EditorSchema>) {
  const name = String(props.props.name ?? '');
  const outputFormat = props.props.outputFormat === 'json' ? 'json' : 'html';
  const buttons = resolveToolbarButtons(props.props.toolbar);
  const placeholder =
    typeof props.props.placeholder === 'string' && props.props.placeholder
      ? props.props.placeholder
      : undefined;

  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });

  const readOnly = presentation.readOnly || !presentation.interactive;
  const handlersRef = useRef(handlers);
  const outputFormatRef = useRef(outputFormat);

  useEffect(() => {
    handlersRef.current = handlers;
  });
  useEffect(() => {
    outputFormatRef.current = outputFormat;
  });

  const editorAttributes: Record<string, string> = {
    class: 'nop-editor-content prose max-w-none focus:outline-none',
    'data-testid': 'editor-content',
    'aria-label': String((props.props.label ?? name) || '') || 'Rich text editor',
    'aria-multiline': 'true',
    role: 'textbox',
  };
  if (placeholder) {
    editorAttributes['data-placeholder'] = placeholder;
  }

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
      extensions: [StarterKit],
      content: readInitialContent(),
      editable: !readOnly,
      immediatelyRender: true,
      editorProps: {
        attributes: editorAttributes,
      },
      onUpdate({ editor: activeEditor }) {
        const fmt = outputFormatRef.current;
        const next = fmt === 'json' ? activeEditor.getJSON() : activeEditor.getHTML();
        lastCommittedRef.current = next;
        handlersRef.current.onChange(next);
      },
      onFocus() {
        handlersRef.current.onFocus();
      },
      onBlur() {
        handlersRef.current.onBlur();
      },
    },
    [],
  );

  // Track the last value committed to the field (initial value or via
  // onUpdate). Comparing against this — instead of re-reading editor.getHTML()
  // — avoids touching ProseMirror's lazily-built DOMSerializer before the view
  // is fully warmed up, and avoids clobbering the caret during active editing.
  const lastCommittedRef = useRef<unknown>(value);

  // Sync external value changes (initial value / programmatic setValue) into the
  // editor without clobbering the user's caret during active editing.
  useEffect(() => {
    if (!editor) {
      return;
    }
    if (presentation.readOnly !== editor.isEditable) {
      editor.setEditable(!presentation.readOnly);
    }
    if (value === lastCommittedRef.current) {
      return;
    }
    if (editor.isFocused) {
      return;
    }
    const nextContent: Content =
      outputFormat === 'json'
        ? (value as Content)
        : sanitizeEditorHtml(String(value ?? ''));
    try {
      editor.commands.setContent(nextContent || '', { emitUpdate: false });
      lastCommittedRef.current = value;
    } catch {
      // Editor view not ready yet (e.g. mid-mount); the next external change
      // re-attempts the sync. The editor still initializes from `content`.
    }
  }, [editor, value, outputFormat, presentation.readOnly]);

  useEffect(() => {
    return () => {
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
          role="toolbar"
          aria-label="Text formatting"
        >
          {buttons.map((id) => {
            const config = TOOLBAR_BUTTONS[id];
            const Icon = TOOLBAR_ICONS[id];
            const active = config.isActive(editor);
            const disabled = !config.canRun(editor);
            return (
              <button
                key={id}
                type="button"
                title={config.title}
                aria-label={config.title}
                aria-pressed={active ? true : undefined}
                data-testid={`editor-toolbar-${id}`}
                data-active={active ? '' : undefined}
                disabled={disabled}
                // Prevent focus theft so the editor keeps its caret/selection
                // when a formatting button is clicked (standard rich-text
                // toolbar pattern; otherwise toggleBold/etc. act on an empty
                // selection).
                onMouseDown={(event) => event.preventDefault()}
                className={cn(
                  'inline-flex h-7 min-w-7 items-center justify-center rounded border border-border bg-background px-1.5 text-xs font-medium transition-colors hover:bg-accent',
                  active && 'bg-accent text-accent-foreground',
                  disabled && 'opacity-40',
                )}
                onClick={() => config.run(editor)}
              >
                {Icon ? <Icon className="size-3.5" /> : config.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-md border border-input bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export const editorRendererDefinition: RendererDefinition = {
  type: 'editor',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: EditorRenderer,
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
