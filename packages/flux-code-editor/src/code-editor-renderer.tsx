import './code-editor-styles.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { resolveRendererSlotContent, useRenderScope } from '@nop-chaos/flux-react';
import { formFieldChromeRules } from '@nop-chaos/flux-renderers-form';
import { cn } from '@nop-chaos/ui';
import { Maximize2Icon, XIcon } from 'lucide-react';
import { ToolbarButton } from './code-editor-renderer/toolbar-button.js';
import type { CodeEditorRendererProps } from './code-editor-renderer/shared.js';
import { ColorizeView } from './code-editor-renderer/colorize.js';
import { useCodeEditorBinding } from './code-editor-renderer/use-code-editor-binding.js';
import { useCodeEditorHandle } from './code-editor-renderer/use-code-editor-handle.js';
import { useSQLEditorSlots, hasSQLToolbarFlags } from './code-editor-renderer/sql-editor-assembly.js';
import { createBaseExtensions } from './extensions/base.js';
import {
  useResolvedFunctions,
  useResolvedTables,
  useResolvedVariables,
} from './source-resolvers.js';
import type {
  CodeEditorSchema,
  EditorLanguage,
  EditorMode,
  ExpressionEditorConfig,
  SQLEditorConfig,
} from './types.js';
import {
  getDefaultAutoHeight,
  getDefaultHeight,
  getDefaultLineNumbers,
} from './types.js';
import { useCodeMirror } from './use-code-mirror.js';
import { useMergeView } from './use-merge-view.js';

function isEditorMode(value: unknown): value is EditorMode {
  return value === 'expression' || value === 'template' || value === 'code';
}

function isEditorTheme(value: unknown): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

function sanitizeExpressionConfig(value: unknown): ExpressionEditorConfig | undefined {
  return value && typeof value === 'object' ? (value as ExpressionEditorConfig) : undefined;
}

function sanitizeSqlConfig(value: unknown): SQLEditorConfig | undefined {
  return value && typeof value === 'object' ? (value as SQLEditorConfig) : undefined;
}

export const codeEditorFieldRules: SchemaFieldRule[] = [
  { key: 'label', kind: 'value-or-region', regionKey: 'label' },
  ...formFieldChromeRules,
  { key: 'value', kind: 'prop' },
  { key: 'diffValue', kind: 'prop' },
  { key: 'colorize', kind: 'prop', valueType: 'boolean' },
  { key: 'language', kind: 'prop' },
  { key: 'mode', kind: 'prop' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'readOnly', kind: 'prop', valueType: 'boolean' },
  { key: 'required', kind: 'prop', valueType: 'boolean' },
  { key: 'expressionConfig', kind: 'prop' },
  { key: 'sqlConfig', kind: 'prop' },
  { key: 'editorTheme', kind: 'prop' },
  { key: 'lineNumbers', kind: 'prop' },
  { key: 'folding', kind: 'prop' },
  { key: 'autoHeight', kind: 'prop' },
  { key: 'allowFullscreen', kind: 'prop' },
  { key: 'options', kind: 'prop' },
  { key: 'height', kind: 'prop' },
  { key: 'width', kind: 'prop' },
  { key: 'onChange', kind: 'event' },
  { key: 'onFocus', kind: 'event' },
  { key: 'onBlur', kind: 'event' },
  { key: 'onEditorMount', kind: 'event' },
];

export function CodeEditorRenderer(props: CodeEditorRendererProps) {
  const scope = useRenderScope();
  const name = String(props.props.name ?? '');
  const forwardedProps = props as CodeEditorRendererProps & {
    id?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
    'aria-invalid'?: boolean;
    onFocus?: React.FocusEventHandler<HTMLDivElement>;
    onBlur?: React.FocusEventHandler<HTMLDivElement>;
  };
  const contentAttributes = Object.fromEntries(
    Object.entries({
      'aria-label': forwardedProps['aria-labelledby'] ? undefined : forwardedProps['aria-label'],
      'aria-labelledby': forwardedProps['aria-labelledby'],
      'aria-describedby': forwardedProps['aria-describedby'],
      'aria-errormessage': forwardedProps['aria-errormessage'],
      'aria-invalid': forwardedProps['aria-invalid'] ? 'true' : undefined,
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );

  const language = (props.props.language as EditorLanguage) ?? 'plaintext';
  const mode = isEditorMode(props.props.mode) ? props.props.mode : undefined;
  const readOnly = props.props.readOnly || props.props.disabled || false;
  const placeholder = props.props.placeholder as string | undefined;
  const editorTheme = isEditorTheme(props.props.editorTheme) ? props.props.editorTheme : 'light';
  const lineNumbers =
    (props.props.lineNumbers as boolean | undefined) ?? getDefaultLineNumbers(language);
  const folding = (props.props.folding as boolean | undefined) ?? false;
  const autoHeight =
    (props.props.autoHeight as boolean | undefined) ?? getDefaultAutoHeight(language);
  const allowFullscreen = (props.props.allowFullscreen as boolean | undefined) ?? false;
  const expressionConfig = sanitizeExpressionConfig(props.props.expressionConfig);
  const sqlConfig = sanitizeSqlConfig(props.props.sqlConfig);
  const labelContent = resolveRendererSlotContent(props, 'label');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => setIsFullscreen((value) => !value);

  const { value, handleChange, handleFocus, handleBlur } = useCodeEditorBinding(props, name);

  const diffValue = props.props.diffValue;
  const isDiffMode = typeof diffValue === 'string';
  const colorizeFlag = props.props.colorize === true;
  const isColorizeMode = colorizeFlag && !isDiffMode;

  const resolvedVariables = useResolvedVariables(expressionConfig, scope);
  const resolvedFunctions = useResolvedFunctions(expressionConfig);
  const resolvedTables = useResolvedTables(sqlConfig, scope);

  const completionConfig = (() => {
    if (language === 'expression' && expressionConfig) {
      return {
        variables: resolvedVariables,
        functions: resolvedFunctions,
      };
    }
    if (language === 'sql' && sqlConfig) {
      return {
        tables: resolvedTables,
      };
    }
    return undefined;
  })();

  const extensions = createBaseExtensions({
        language,
        mode,
        lineNumbers,
        folding,
        autoHeight,
        editorTheme,
        sqlDialect: sqlConfig?.dialect,
        completionConfig,
        lintConfig: language === 'expression' ? expressionConfig?.lint : undefined,
        showFriendlyNames:
          language === 'expression' ? expressionConfig?.showFriendlyNames : undefined,
      });

  const height = (props.props.height as number | string | undefined) ?? getDefaultHeight(language);
  const width = (props.props.width as number | string | undefined) ?? '100%';

  const containerStyle = useMemo<React.CSSProperties>(
    () => ({
      height: typeof height === 'number' ? `${height}px` : height,
      width: typeof width === 'number' ? `${width}px` : width,
      overflow: autoHeight ? undefined : 'auto',
    }),
    [height, width, autoHeight],
  );

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const singleEditor = useCodeMirror({
    initialValue: value,
    placeholder,
    readOnly,
    extensions,
    contentAttributes,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  const mergeEditor = useMergeView({
    original: typeof diffValue === 'string' ? diffValue : '',
    modified: value,
    placeholder,
    readOnly,
    extensions,
    contentAttributes,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  const isSQL = !isDiffMode && language === 'sql' && Boolean(sqlConfig);
  const editorRef = isDiffMode ? mergeEditor.editorRef : singleEditor.editorRef;
  const view = isDiffMode ? mergeEditor.view : singleEditor.view;

  const initialValueRef = useRef(value);
  useEffect(() => {
    initialValueRef.current = value;
  }, [value]);

  useCodeEditorHandle(props, { view, initialValueRef });

  // Fire onEditorMount after the editor view is ready.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!view || mountedRef.current) return;
    mountedRef.current = true;
    const editorId = String(props.id ?? props.meta.cid ?? '');
    props.events.onEditorMount?.({ editorId });
  }, [view, props.events, props.id, props.meta.cid]);

  const sqlSlots = useSQLEditorSlots({
    props,
    sqlConfig,
    scope,
    view,
    allowFullscreen,
    isFullscreen,
    toggleFullscreen,
    editorRef,
  });

  const hasSQLToolbar = isSQL && hasSQLToolbarFlags(sqlConfig);
  const showToolbar =
    (allowFullscreen && !isFullscreen) || hasSQLToolbar;

  if (isColorizeMode) {
    return (
      <div
        className={cn('nop-code-editor', props.meta.className)}
        data-theme={editorTheme}
        data-colorize-container=""
        data-readonly
        style={!isFullscreen ? containerStyle : undefined}
      >
        <ColorizeView
          value={value}
          language={language}
          editorTheme={editorTheme}
          className="nop-code-editor-colorize"
          style={{
            margin: 0,
            padding: '8px 12px',
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: '13px',
            lineHeight: 1.5,
            overflow: autoHeight ? undefined : 'auto',
            height: '100%',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn('nop-code-editor', props.meta.className)}
      data-theme={editorTheme}
      data-fullscreen={isFullscreen || undefined}
      data-has-toolbar={showToolbar || undefined}
      data-readonly={readOnly || undefined}
      data-diff={isDiffMode || undefined}
      style={!isFullscreen ? containerStyle : undefined}
    >
      {isFullscreen && allowFullscreen ? (
        <div data-slot="code-editor-header">
          <span data-slot="code-editor-header-title">{String(labelContent ?? '')}</span>
          <ToolbarButton
            data-slot="code-editor-header-close"
            onClick={() => setIsFullscreen(false)}
            aria-label={t('flux.codeEditor.exitFullscreen')}
            title={t('flux.codeEditor.exitFullscreen')}
          >
            <XIcon />
          </ToolbarButton>
        </div>
      ) : null}

      {isSQL ? sqlSlots.toolbar : null}

      {!isSQL && allowFullscreen && !isFullscreen ? (
        <div data-slot="code-editor-toolbar">
          <ToolbarButton
            data-slot="code-editor-toolbar-fullscreen"
            onClick={toggleFullscreen}
            aria-label={t('flux.codeEditor.enterFullscreen')}
            title={t('flux.codeEditor.fullscreen')}
          >
            <Maximize2Icon />
          </ToolbarButton>
        </div>
      ) : null}

      {isSQL ? sqlSlots.body : <div ref={editorRef} />}

      {isSQL ? sqlSlots.resultPanel : null}
    </div>
  );
}

export const codeEditorRendererDefinition: RendererDefinition = {
  type: 'code-editor',
  component: CodeEditorRenderer,
  sourcePackage: '@nop-chaos/flux-code-editor',
  propContracts: {
    language: {
      shape: { kind: 'string' },
      displayName: 'Language',
      description: 'Code editor language mode.',
      editorType: 'select',
      required: true,
    },
    mode: {
      shape: { kind: 'string' },
      displayName: 'Mode',
      description: 'Optional editor mode override such as template mode.',
      editorType: 'text',
    },
    value: {
      shape: { kind: 'string' },
      displayName: 'Value',
      description: 'Initial or controlled editor text value.',
      editorType: 'textarea',
    },
    diffValue: {
      shape: { kind: 'string' },
      displayName: 'Diff Value',
      description:
        'Original text for side-by-side diff rendering. When set, the editor switches to a two-pane MergeView (left = diffValue, right = value).',
      editorType: 'textarea',
    },
    colorize: {
      shape: { kind: 'boolean' },
      displayName: 'Colorize',
      description:
        'When true (and diffValue is not set), render the value as a read-only statically-highlighted <pre> without instantiating an EditorView. Orthogonal to readOnly.',
      editorType: 'boolean',
    },
    placeholder: {
      shape: { kind: 'string' },
      displayName: 'Placeholder',
      description: 'Placeholder shown when the editor is empty.',
      editorType: 'text',
    },
    expressionConfig: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Expression Config',
      description: 'Expression-mode variables, functions, and lint settings.',
      editorType: 'object',
    },
    sqlConfig: {
      shape: { kind: 'object', fields: {} },
      displayName: 'SQL Config',
      description: 'SQL-mode tables, dialect, snippets, variables, and preview settings.',
      editorType: 'object',
    },
    lineNumbers: {
      shape: { kind: 'boolean' },
      displayName: 'Line Numbers',
      description: 'Whether to show line numbers.',
      editorType: 'boolean',
    },
    folding: {
      shape: { kind: 'boolean' },
      displayName: 'Folding',
      description: 'Whether code folding affordances are enabled.',
      editorType: 'boolean',
    },
    autoHeight: {
      shape: { kind: 'boolean' },
      displayName: 'Auto Height',
      description: 'Whether the editor grows with its content.',
      editorType: 'boolean',
    },
    allowFullscreen: {
      shape: { kind: 'boolean' },
      displayName: 'Allow Fullscreen',
      description: 'Whether the editor exposes fullscreen controls.',
      editorType: 'boolean',
    },
    editorTheme: {
      shape: { kind: 'string' },
      displayName: 'Editor Theme',
      description: 'Editor color theme.',
      editorType: 'select',
    },
    options: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Options',
      description: 'Additional editor options bag.',
      editorType: 'object',
    },
    height: {
      shape: { kind: 'unknown' },
      displayName: 'Height',
      description: 'Editor height.',
      editorType: 'text',
    },
    width: {
      shape: { kind: 'unknown' },
      displayName: 'Width',
      description: 'Editor width.',
      editorType: 'text',
    },
  },
  eventContracts: {
    onChange: {
      displayName: 'Change',
      description: 'Runs when the editor value changes.',
      payload: { kind: 'string' },
    },
    onFocus: {
      displayName: 'Focus',
      description: 'Runs when the editor receives focus.',
    },
    onBlur: {
      displayName: 'Blur',
      description: 'Runs when the editor loses focus.',
    },
    onEditorMount: {
      displayName: 'Editor Mount',
      description:
        'Runs after the CodeMirror editor (or MergeView) is mounted. Payload: { editorId }. Use the `getEditorView` component handle for imperative access to the EditorView instance.',
      payload: {
        kind: 'object',
        fields: { editorId: { kind: 'string' } },
      },
    },
  },
  componentCapabilityContracts: [
    {
      handle: 'clear',
      displayName: 'Clear',
      description: 'Clear the editor content (sets value to empty string).',
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Reset the editor content to its initial value.',
    },
    {
      handle: 'focus',
      displayName: 'Focus',
      description: 'Focus the editor.',
    },
    {
      handle: 'getEditorView',
      displayName: 'Get EditorView',
      description:
        'Return the underlying CodeMirror EditorView instance. Result is an unserializable EditorView reference (treat as opaque handle).',
      result: { kind: 'unknown' },
    },
  ],
  fields: codeEditorFieldRules,
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema: CodeEditorSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: CodeEditorSchema) {
      const rules: Array<{ kind: 'required'; message?: string }> = [];
      if (schema.required) {
        rules.push({ kind: 'required', message: `${schema.label || 'Code'} cannot be empty` });
      }
      return rules;
    },
  },
  wrap: true,
};
