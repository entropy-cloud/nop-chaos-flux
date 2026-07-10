import { Component, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  Heading2Icon,
  QuoteIcon,
  ListIcon,
  ListOrderedIcon,
  LinkIcon,
  ImageIcon,
  CodeIcon,
  MinusIcon,
  TableIcon,
} from 'lucide-react';
import {
  stringAdapter,
  type RendererComponentProps,
  type RendererDefinition,
  type SchemaFieldRule,
} from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, cn, Textarea, useIsMobile } from '@nop-chaos/ui';
import { formFieldRules, useFormFieldController } from '../field-utils.js';
import type { MarkdownEditorSchema } from '../schemas.js';
import { createFieldValidation, validateInputFieldSchema } from './input.js';

const stringValueAdapter = stringAdapter();
const MARKDOWN_EDITOR_METHODS = ['clear', 'focus'] as const;

export const markdownEditorFieldRules: SchemaFieldRule[] = [
  { key: 'placeholder', kind: 'prop' },
  { key: 'viewMode', kind: 'prop' },
  { key: 'toolbar', kind: 'prop', valueType: 'boolean' },
];

const MARKDOWN_EDITOR_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the markdown source to an empty string.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the markdown editor textarea.',
  },
] as const;

interface ToolbarAction {
  id: string;
  icon: ReactNode;
  title: string;
  apply: (selected: string) => { text: string; selectOffset?: number; selectLength?: number };
}

function prefixLines(text: string, prefix: (line: string, index: number) => string): string {
  return text.split('\n').map((line, i) => prefix(line, i)).join('\n');
}

const TOOLBAR_GROUPS: ToolbarAction[][] = [
  [
    { id: 'bold', icon: <BoldIcon className="size-4" />, title: 'Bold', apply: (s) => ({ text: `**${s || 'bold'}**` }) },
    { id: 'italic', icon: <ItalicIcon className="size-4" />, title: 'Italic', apply: (s) => ({ text: `*${s || 'italic'}*` }) },
    { id: 'strike', icon: <StrikethroughIcon className="size-4" />, title: 'Strikethrough', apply: (s) => ({ text: `~~${s || 'strikethrough'}~~` }) },
    { id: 'code', icon: <CodeIcon className="size-4" />, title: 'Code', apply: (s) => ({ text: s.includes('\n') ? `\`\`\`\n${s || 'code'}\n\`\`\`` : `\`${s || 'code'}\`` }) },
  ],
  [
    { id: 'heading', icon: <Heading2Icon className="size-4" />, title: 'Heading', apply: (s) => ({ text: `## ${s || 'heading'}` }) },
    { id: 'quote', icon: <QuoteIcon className="size-4" />, title: 'Quote', apply: (s) => ({ text: s ? prefixLines(s, (l) => `> ${l}`) : '> quote' }) },
    { id: 'ul', icon: <ListIcon className="size-4" />, title: 'Bulleted list', apply: (s) => ({ text: s ? prefixLines(s, (l) => `- ${l}`) : '- item' }) },
    { id: 'ol', icon: <ListOrderedIcon className="size-4" />, title: 'Numbered list', apply: (s) => ({ text: s ? prefixLines(s, (l, i) => `${i + 1}. ${l}`) : '1. item' }) },
    { id: 'hr', icon: <MinusIcon className="size-4" />, title: 'Horizontal rule', apply: (s) => ({ text: s ? `${s}\n\n---` : '---' }) },
  ],
  [
    { id: 'link', icon: <LinkIcon className="size-4" />, title: 'Link', apply: (s) => ({ text: `[${s || 'link'}](https://)` }) },
    { id: 'image', icon: <ImageIcon className="size-4" />, title: 'Image', apply: (s) => ({ text: `![${s || 'alt text'}](https://)` }) },
    { id: 'table', icon: <TableIcon className="size-4" />, title: 'Table', apply: () => ({ text: '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |' }) },
  ],
];

function insertMarkdownSyntax(
  source: string,
  start: number,
  end: number,
  action: ToolbarAction,
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = source.slice(0, start);
  const selected = source.slice(start, end);
  const after = source.slice(end);
  const result = action.apply(selected);
  const inserted = result.text;
  const nextValue = `${before}${inserted}${after}`;
  const replacementLength = inserted.length;
  return {
    value: nextValue,
    selectionStart: start,
    selectionEnd: start + replacementLength,
  };
}

interface PreviewBoundaryProps {
  source: string;
  children: ReactNode;
}

interface PreviewBoundaryState {
  error: Error | null;
}

class PreviewBoundary extends Component<PreviewBoundaryProps, PreviewBoundaryState> {
  state: PreviewBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PreviewBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: PreviewBoundaryProps) {
    if (prevProps.source !== this.props.source && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <pre
          data-slot="markdown-editor-preview-fallback"
          className="m-0 whitespace-pre-wrap break-words text-sm"
        >
          {this.props.source}
        </pre>
      );
    }
    return this.props.children;
  }
}

/**
 * markdown-editor: markdown source editing (Textarea) + live preview rendered
 * via runtime registry composition. The preview area renders a child `markdown`
 * schema node through `helpers.render`, so `flux-renderers-form` does not depend
 * on react-markdown directly — the registered `markdown` renderer (from
 * `flux-renderers-content`) owns the rendering. This keeps the form package free
 * of workspace-external markdown dependencies and guarantees preview/renderer
 * parity (W3d design §10).
 */
export function MarkdownEditorRenderer(props: RendererComponentProps<MarkdownEditorSchema>) {
  const name = String(props.props.name ?? '');
  const isMobile = useIsMobile();
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const source = (value as string | undefined) ?? '';
  const errorId = name ? `${name}-error` : undefined;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const viewMode =
    props.props.viewMode === 'edit' || props.props.viewMode === 'preview'
      ? props.props.viewMode
      : 'split';
  const showToolbar = props.props.toolbar !== false;
  const interactive = presentation.interactive;

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'markdown-editor',
    cid: props.meta.cid,
    methods: MARKDOWN_EDITOR_METHODS,
    getFocusTarget: () => textareaRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(''),
  });

  function runToolbarAction(action: ToolbarAction) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? source.length;
    const end = el?.selectionEnd ?? source.length;
    const result = insertMarkdownSyntax(source, start, end, action);
    handlers.onChange(result.value);
    pendingSelectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
  }

  useEffect(() => {
    const target = pendingSelectionRef.current;
    if (!target) {
      return;
    }
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(target.start, target.end);
    }
    pendingSelectionRef.current = null;
  }, [source]);

  const showEdit = viewMode !== 'preview';
  const showPreview = viewMode !== 'edit';

  // The preview composes the registered `markdown` renderer through the runtime
  // registry. Flux composition is scope-bound: a literal `content` value would
  // be resolved once and not refresh as the source changes. We therefore feed
  // the live source through a fragment-scope binding (`__mdPreview`) and let the
  // markdown node's `content` resolve it as a reactive scope expression. This
  // keeps `flux-renderers-form` free of react-markdown while guaranteeing the
  // preview tracks every keystroke (W3d design §10).
  const previewNode = showPreview
    ? (props.helpers.render(
        { type: 'markdown', content: '${__mdPreview}' } as never,
        { bindings: { __mdPreview: source }, pathSuffix: 'preview' },
      ) as ReactNode)
    : null;

  return (
    <div
      className={cn('nop-markdown-editor', props.meta.className)}
      data-slot="markdown-editor"
      data-view-mode={viewMode}
      data-invalid={presentation.showError ? '' : undefined}
    >
      {showToolbar && showEdit && interactive ? (
        <div
          className="nop-markdown-editor-toolbar mb-1.5 flex flex-wrap items-center gap-1"
          data-slot="markdown-editor-toolbar"
          role="toolbar"
          aria-label="Markdown formatting"
        >
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div key={group[0].id} className="flex items-center gap-1">
              {gi > 0 ? <span className="h-4 w-px bg-border" aria-hidden="true" /> : null}
              {group.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  title={action.title}
                  aria-label={action.title}
                  data-testid={`md-toolbar-${action.id}`}
                  className="size-8 p-0"
                  onClick={() => runToolbarAction(action)}
                >
                  {action.icon}
                </Button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          'nop-markdown-editor-body grid gap-3',
          viewMode === 'split' && !isMobile ? 'md:grid-cols-2' : 'grid-cols-1',
        )}
        data-slot="markdown-editor-body"
      >
        {showEdit ? (
          <div className="nop-markdown-editor-input" data-slot="markdown-editor-input">
            <Textarea
              ref={textareaRef}
              id={name ? `${name}-control` : undefined}
              name={name || undefined}
              value={source}
              rows={8}
              disabled={presentation.effectiveDisabled}
              readOnly={presentation.readOnly}
              spellCheck={false}
              aria-label={String((props.props.label ?? name) || '') || undefined}
              aria-required={props.props.required ? true : undefined}
              aria-invalid={presentation.showError ? true : undefined}
              aria-describedby={presentation.showError ? errorId : undefined}
              placeholder={
                props.props.placeholder ? String(props.props.placeholder) : 'Enter markdown…'
              }
              className="font-mono text-sm"
              data-testid="markdown-editor-textarea"
              onFocus={handlers.onFocus}
              onChange={(event) => handlers.onChange(event.target.value)}
              onBlur={handlers.onBlur}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div
            className="nop-markdown-editor-preview rounded-md border border-border bg-muted/30 p-3 text-sm overflow-auto"
            data-slot="markdown-editor-preview"
            data-testid="markdown-editor-preview"
          >
            <PreviewBoundary source={source}>{previewNode}</PreviewBoundary>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const markdownEditorRendererDefinition: RendererDefinition = {
  type: 'markdown-editor',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  fields: [...formFieldRules, ...markdownEditorFieldRules],
  validation: createFieldValidation(),
  schemaValidator: validateInputFieldSchema,
  componentCapabilityContracts: MARKDOWN_EDITOR_CAPABILITY_CONTRACTS,
  wrap: true,
  component: MarkdownEditorRenderer,
};
