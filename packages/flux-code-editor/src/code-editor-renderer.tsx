import { useMemo, useState, useCallback, useEffect } from 'react';
import type { RendererComponentProps, RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import type { ApiObject, ActionResult } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import { XIcon, Maximize2Icon, PlayIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import { useCodeMirror } from './use-code-mirror';
import { createBaseExtensions } from './extensions/base';
import { formatSQL } from './extensions/sql/format';
import { SnippetPanel } from './extensions/snippet-panel';
import { VariablePanel } from './variable-panel';
import { SQLResultPanel } from './sql-result-panel';
import type { SQLResultState } from './sql-result-panel';
import type {
  CodeEditorSchema,
  EditorLanguage,
  EditorMode,
  ExpressionEditorConfig,
  SQLEditorConfig,
} from './types';
import {
  getDefaultLineNumbers,
  getDefaultAutoHeight,
  getDefaultHeight,
  resolveFormatConfig,
} from './types';
import {
  useResolvedVariables,
  useResolvedFunctions,
  useResolvedTables,
  useResolvedSQLVariables,
} from './source-resolvers';

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

export function CodeEditorRenderer(props: RendererComponentProps<CodeEditorSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();

  const language = (props.props.language as EditorLanguage) ?? 'plaintext';
  const mode = props.props.mode as EditorMode | undefined;
  const readOnly = Boolean(props.props.readOnly ?? props.meta.disabled);
  const placeholder = props.props.placeholder as string | undefined;
  const editorTheme = (props.props.editorTheme as 'light' | 'dark') ?? 'light';
  const lineNumbers = props.props.lineNumbers as boolean | undefined ?? getDefaultLineNumbers(language);
  const folding = props.props.folding as boolean | undefined ?? false;
  const autoHeight = props.props.autoHeight as boolean | undefined ?? getDefaultAutoHeight(language);

  const allowFullscreen = props.props.allowFullscreen as boolean | undefined ?? false;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen(v => !v), []);

  const expressionConfig = props.props.expressionConfig as ExpressionEditorConfig | undefined;
  const sqlConfig = props.props.sqlConfig as SQLEditorConfig | undefined;

  const name = String(props.props.name ?? props.schema.name ?? '');

  const formatConfig = resolveFormatConfig(sqlConfig);
  const hasSnippets = Boolean(sqlConfig?.snippets?.length);
  const hasVariablePanel = Boolean(sqlConfig?.variablePanel?.enabled);
  const hasExecution = Boolean(sqlConfig?.execution?.enabled);

  const hasSQLToolbar = language === 'sql' && (
    Boolean(formatConfig) || hasSnippets || hasVariablePanel || hasExecution
  );

  const [variablePanelCollapsed, setVariablePanelCollapsed] = useState(false);
  const [sqlResult, setSqlResult] = useState<SQLResultState>({ status: 'idle' });

  let value: string;
  if (currentForm && name) {
    const formValues = currentForm.store.getState().values;
    value = String((name.split('.').reduce((obj: any, key: string) => obj?.[key], formValues)) ?? '');
  } else if (name) {
    value = String(scope.get(name) ?? '');
  } else {
    value = String(props.props.value ?? '');
  }

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

  const handleChange = (newValue: string) => {
    if (currentForm && name) {
      currentForm.setValue(name, newValue);
    } else if (name) {
      scope.update(name, newValue);
    }
    props.events.onChange?.({ value: newValue });
  };

  const handleFocus = () => {
    if (currentForm && name) {
      currentForm.visitField(name);
    }
    props.events.onFocus?.();
  };

  const handleBlur = () => {
    if (currentForm && name) {
      currentForm.touchField(name);
    }
    props.events.onBlur?.();
  };

  const height = props.props.height as number | string | undefined ?? getDefaultHeight(language);
  const width = props.props.width as number | string | undefined ?? '100%';

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
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

  const insertAtCursor = useCallback((text: string) => {
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: text },
    });
    view.focus();
  }, [view]);

  const handleFormatSQL = useCallback(() => {
    if (!view || !sqlConfig?.format) return;
    const currentSQL = view.state.doc.toString();
    const formatted = formatSQL(currentSQL, sqlConfig.format, sqlConfig.dialect);
    if (formatted !== currentSQL) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
      view.focus();
    }
  }, [view, sqlConfig]);

  const handleExecuteSQL = useCallback(async () => {
    if (!sqlConfig?.execution?.enabled || !view) return;

    setSqlResult({ status: 'loading' });

    try {
      const sqlText = view.state.doc.toString();
      const onExecute = sqlConfig.execution.onExecute;

      let result: ActionResult;
      if (typeof onExecute === 'string') {
        result = await props.helpers.dispatch({
          action: onExecute,
          args: { sql: sqlText },
        } as any);
      } else if (onExecute && typeof onExecute === 'object') {
        const apiAction: any = {
          action: 'ajax',
          api: {
            ...(onExecute as ApiObject),
            data: { sql: sqlText },
          },
        };
        result = await props.helpers.dispatch(apiAction);
      } else {
        result = await props.helpers.dispatch({
          action: 'ajax',
          api: {
            url: '/api/report/execSql',
            method: 'POST',
            data: { sql: sqlText },
          },
        } as any);
      }

      if (result.ok && result.data != null) {
        const resultPath = sqlConfig.execution.resultPath;
        let data = result.data as any;
        if (resultPath) {
          data = resultPath.split('.').reduce((obj: any, key: string) => obj?.[key], data);
        }

        if (Array.isArray(data)) {
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          setSqlResult({ status: 'success', data, columns });
        } else {
          setSqlResult({ status: 'success', data: [{ result: String(data) }], columns: ['result'] });
        }
      } else {
        setSqlResult({
          status: 'error',
          message: result.error ? String(result.error) : 'Execution returned no data',
        });
      }
    } catch (err: any) {
      setSqlResult({
        status: 'error',
        message: err?.message ?? String(err),
      });
    }
  }, [view, sqlConfig, props.helpers]);

  const handleClearResult = useCallback(() => {
    setSqlResult({ status: 'idle' });
  }, []);

  const sqlVariables = useResolvedSQLVariables(sqlConfig, scope, props.helpers.dispatch);

  const showToolbar = (allowFullscreen && !isFullscreen) || hasSQLToolbar;

  return (
    <div
      className={`nop-code-editor${isFullscreen ? ' nop-code-editor--fullscreen' : ''}${showToolbar ? ' nop-code-editor--has-toolbar' : ''}`}
      data-testid={props.meta.testid}
      data-theme={editorTheme}
      style={!isFullscreen ? containerStyle : undefined}
    >
      {isFullscreen && allowFullscreen && (
        <div className="nop-code-editor__header">
          <span className="nop-code-editor__header-title">{props.meta.label || props.schema.label}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsFullscreen(false)}
            aria-label="Exit fullscreen"
          >
            <XIcon />
          </Button>
        </div>
      )}
      {showToolbar && (
        <div className="nop-code-editor__toolbar">
          {language === 'sql' && (
            <>
              {formatConfig && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleFormatSQL}
                  title="Format SQL"
                >
                  Format
                </Button>
              )}
              {hasSnippets && (
                <SnippetPanel
                  snippets={sqlConfig!.snippets!}
                  onInsert={insertAtCursor}
                />
              )}
              {hasVariablePanel && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setVariablePanelCollapsed(v => !v)}
                  title={variablePanelCollapsed ? 'Show variables' : 'Hide variables'}
                >
                  {variablePanelCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                  Vars
                </Button>
              )}
              {hasExecution && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleExecuteSQL}
                  title="Execute SQL"
                >
                  <PlayIcon />
                  Run
                </Button>
              )}
            </>
          )}
          {allowFullscreen && !isFullscreen && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleFullscreen}
              aria-label="Enter fullscreen"
              title="Fullscreen"
            >
              <Maximize2Icon />
            </Button>
          )}
        </div>
      )}
      <div className={hasVariablePanel ? 'nop-code-editor__body' : undefined} style={hasVariablePanel ? { display: 'flex', flex: 1, minHeight: 0 } : undefined}>
        <div
          ref={editorRef}
          style={isFullscreen ? { flex: 1, overflow: 'auto' } : hasVariablePanel ? { flex: 1, minHeight: 0 } : undefined}
        />
        {hasVariablePanel && (
          <VariablePanel
            variables={sqlVariables}
            insertTemplate={sqlConfig!.variablePanel!.insertTemplate}
            onInsert={insertAtCursor}
            collapsed={variablePanelCollapsed}
            onToggleCollapse={() => setVariablePanelCollapsed(v => !v)}
          />
        )}
      </div>
      {hasExecution && sqlResult.status !== 'idle' && (
        <div className="nop-code-editor__result-container">
          <SQLResultPanel result={sqlResult} onClose={handleClearResult} />
        </div>
      )}
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
