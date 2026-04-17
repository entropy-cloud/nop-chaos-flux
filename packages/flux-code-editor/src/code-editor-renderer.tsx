import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { useRenderScope } from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';
import { CodeEditorBody } from './code-editor-renderer/CodeEditorBody';
import { CodeEditorToolbar } from './code-editor-renderer/CodeEditorToolbar';
import type { CodeEditorRendererProps } from './code-editor-renderer/shared';
import { useCodeEditorBinding } from './code-editor-renderer/use-code-editor-binding';
import { useSQLEditorState } from './code-editor-renderer/use-sql-editor-state';
import { createBaseExtensions } from './extensions/base';
import { useResolvedFunctions, useResolvedSQLVariables, useResolvedTables, useResolvedVariables } from './source-resolvers';
import { SQLResultPanel } from './sql-result-panel';
import type { CodeEditorSchema, EditorLanguage, EditorMode, ExpressionEditorConfig, SQLEditorConfig } from './types';
import { getDefaultAutoHeight, getDefaultHeight, getDefaultLineNumbers, resolveFormatConfig } from './types';
import { useCodeMirror } from './use-code-mirror';

export const codeEditorFieldRules: SchemaFieldRule[] = [
  { key: 'value', kind: 'prop' },
  { key: 'language', kind: 'prop' },
  { key: 'mode', kind: 'prop' },
  { key: 'placeholder', kind: 'prop' },
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
  const readOnly = Boolean(props.props.readOnly ?? props.meta.disabled);
  const placeholder = props.props.placeholder as string | undefined;
  const editorTheme = (props.props.editorTheme as 'light' | 'dark') ?? 'light';
  const lineNumbers = (props.props.lineNumbers as boolean | undefined) ?? getDefaultLineNumbers(language);
  const folding = (props.props.folding as boolean | undefined) ?? false;
  const autoHeight = (props.props.autoHeight as boolean | undefined) ?? getDefaultAutoHeight(language);
  const allowFullscreen = (props.props.allowFullscreen as boolean | undefined) ?? false;
  const expressionConfig = props.props.expressionConfig as ExpressionEditorConfig | undefined;
  const sqlConfig = props.props.sqlConfig as SQLEditorConfig | undefined;
  const name = String(props.props.name ?? props.schema.name ?? '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen((value) => !value), []);

  const { value, handleChange, handleFocus, handleBlur } = useCodeEditorBinding(props, name);

  const resolvedVariables = useResolvedVariables(expressionConfig, scope, props.helpers.dispatch);
  const resolvedFunctions = useResolvedFunctions(expressionConfig, props.helpers.dispatch);
  const resolvedTables = useResolvedTables(sqlConfig, scope, props.helpers.dispatch);

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
        showFriendlyNames: language === 'expression' ? expressionConfig?.showFriendlyNames : undefined,
      }),
    [language, mode, lineNumbers, folding, autoHeight, editorTheme, sqlConfig?.dialect, completionConfig, expressionConfig?.lint, expressionConfig?.showFriendlyNames],
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

  const {
    hasSnippets,
    hasVariablePanel,
    hasExecution,
    variablePanelCollapsed,
    setVariablePanelCollapsed,
    sqlResult,
    insertAtCursor,
    handleFormatSQL,
    handleExecuteSQL,
    handleClearResult,
  } = useSQLEditorState(props, sqlConfig, view);

  const sqlVariables = useResolvedSQLVariables(sqlConfig, scope, props.helpers.dispatch);
  const formatConfig = resolveFormatConfig(sqlConfig);
  const hasSQLToolbar = language === 'sql' && (Boolean(formatConfig) || hasSnippets || hasVariablePanel || hasExecution);
  const showToolbar = (allowFullscreen && !isFullscreen) || hasSQLToolbar;

  return (
    <div
      className="nop-code-editor"
      data-testid={props.meta.testid}
      data-theme={editorTheme}
      data-fullscreen={isFullscreen || undefined}
      data-has-toolbar={showToolbar || undefined}
      style={!isFullscreen ? containerStyle : undefined}
    >
      {isFullscreen && allowFullscreen ? (
        <div data-slot="code-editor-header">
          <span data-slot="code-editor-header-title">{String(props.props.label ?? props.schema.label ?? '')}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            data-slot="code-editor-header-close"
            onClick={() => setIsFullscreen(false)}
            aria-label="Exit fullscreen"
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      {showToolbar ? (
        <CodeEditorToolbar
          language={language}
          allowFullscreen={allowFullscreen}
          isFullscreen={isFullscreen}
          formatConfig={formatConfig}
          snippets={sqlConfig?.snippets}
          hasVariablePanel={hasVariablePanel}
          hasExecution={hasExecution}
          variablePanelCollapsed={variablePanelCollapsed}
          onFormatSQL={handleFormatSQL}
          onInsertSnippet={insertAtCursor}
          onToggleVariables={() => setVariablePanelCollapsed((value) => !value)}
          onExecuteSQL={handleExecuteSQL}
          onEnterFullscreen={toggleFullscreen}
        />
      ) : null}

      <CodeEditorBody
        editorRef={editorRef}
        isFullscreen={isFullscreen}
        hasVariablePanel={hasVariablePanel}
        variablePanelCollapsed={variablePanelCollapsed}
        sqlVariables={sqlVariables}
        insertTemplate={sqlConfig?.variablePanel?.insertTemplate}
        onInsertVariable={insertAtCursor}
        onToggleVariablePanel={() => setVariablePanelCollapsed((value) => !value)}
      />

      {hasExecution && sqlResult.status !== 'idle' ? (
        <div data-slot="code-editor-result-container">
          <SQLResultPanel result={sqlResult} onClose={handleClearResult} />
        </div>
      ) : null}
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
