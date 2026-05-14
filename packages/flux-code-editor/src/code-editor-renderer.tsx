import './code-editor-styles.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useRenderScope } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { Maximize2Icon, XIcon } from 'lucide-react';
import { ToolbarButton } from './code-editor-renderer/toolbar-button.js';
import type { CodeEditorRendererProps } from './code-editor-renderer/shared.js';
import { useCodeEditorBinding } from './code-editor-renderer/use-code-editor-binding.js';
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

export const codeEditorFieldRules: SchemaFieldRule[] = [
  { key: 'label', kind: 'value-or-region', regionKey: 'label' },
  { key: 'value', kind: 'prop' },
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
];

export function CodeEditorRenderer(props: CodeEditorRendererProps) {
  const scope = useRenderScope();

  const language = (props.props.language as EditorLanguage) ?? 'plaintext';
  const mode = props.props.mode as EditorMode | undefined;
  const readOnly = props.props.readOnly || props.props.disabled || false;
  const placeholder = props.props.placeholder as string | undefined;
  const editorTheme = (props.props.editorTheme as 'light' | 'dark') ?? 'light';
  const lineNumbers =
    (props.props.lineNumbers as boolean | undefined) ?? getDefaultLineNumbers(language);
  const folding = (props.props.folding as boolean | undefined) ?? false;
  const autoHeight =
    (props.props.autoHeight as boolean | undefined) ?? getDefaultAutoHeight(language);
  const allowFullscreen = (props.props.allowFullscreen as boolean | undefined) ?? false;
  const expressionConfig = props.props.expressionConfig as ExpressionEditorConfig | undefined;
  const sqlConfig = props.props.sqlConfig as SQLEditorConfig | undefined;
  const name = String(props.props.name ?? '');
  const labelContent = resolveRendererSlotContent(props, 'label');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen((value) => !value), []);

  const { value, handleChange, handleFocus, handleBlur } = useCodeEditorBinding(props, name);

  const resolvedVariables = useResolvedVariables(expressionConfig, scope);
  const resolvedFunctions = useResolvedFunctions(expressionConfig);
  const resolvedTables = useResolvedTables(sqlConfig, scope);

  const completionConfig = useMemo(() => {
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
  }, [language, expressionConfig, sqlConfig, resolvedVariables, resolvedFunctions, resolvedTables]);

  const extensions = useMemo(
    () =>
      createBaseExtensions({
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
      }),
    [
      language,
      mode,
      lineNumbers,
      folding,
      autoHeight,
      editorTheme,
      sqlConfig?.dialect,
      completionConfig,
      expressionConfig?.lint,
      expressionConfig?.showFriendlyNames,
    ],
  );

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

  const { editorRef, view } = useCodeMirror({
    initialValue: value,
    placeholder,
    readOnly,
    extensions,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  const isSQL = language === 'sql' && Boolean(sqlConfig);
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

  return (
    <div
      className={cn('nop-code-editor', props.meta.className)}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      data-testid={props.meta.testid}
      data-theme={editorTheme}
      data-fullscreen={isFullscreen || undefined}
      data-has-toolbar={showToolbar || undefined}
      data-readonly={readOnly || undefined}
      style={!isFullscreen ? containerStyle : undefined}
    >
      {isFullscreen && allowFullscreen ? (
        <div data-slot="code-editor-header">
          <span data-slot="code-editor-header-title">{String(labelContent ?? '')}</span>
          <ToolbarButton
            data-slot="code-editor-header-close"
            onClick={() => setIsFullscreen(false)}
            aria-label="Exit fullscreen"
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
            aria-label="Enter fullscreen"
            title="Fullscreen"
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
