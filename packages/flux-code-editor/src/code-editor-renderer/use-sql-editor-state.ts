import { useCallback, useState } from 'react';
import type { ActionResult, ActionSchema, ApiSchema, SchemaValue } from '@nop-chaos/flux-core';
import type { EditorView } from '@codemirror/view';
import { formatSQL } from '../extensions/sql/format';
import type { SQLResultState } from '../sql-result-panel';
import type { SQLEditorConfig } from '../types';
import type { CodeEditorRendererProps } from './shared';

function isSchemaValue(value: unknown): value is SchemaValue {
  if (value == null) {
    return true;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint' || typeof value === 'symbol') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isSchemaValue);
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isSchemaValue);
  }
  return false;
}

function readScopePath(props: CodeEditorRendererProps, path: string): SchemaValue | undefined {
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === 'value') {
    return isSchemaValue(props.props.value) ? props.props.value : undefined;
  }

  if (trimmed.startsWith('value.')) {
    const rest = trimmed.slice('value.'.length);
    const currentValue = props.props.value;
    if (!rest || currentValue == null || typeof currentValue !== 'object') {
      return isSchemaValue(currentValue) ? currentValue : undefined;
    }

    let current: unknown = currentValue;
    for (const key of rest.split('.')) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return isSchemaValue(current) ? current : undefined;
  }

  const resolved = props.node.scope.get(trimmed);
  return isSchemaValue(resolved) ? resolved : undefined;
}

function buildExecutionParams(props: CodeEditorRendererProps, mappings: Record<string, string> | undefined): Record<string, SchemaValue> | undefined {
  if (!mappings) {
    return undefined;
  }

  const entries = Object.entries(mappings)
      .map(([key, path]) => [key, typeof path === 'string' ? readScopePath(props, path) : undefined] as const)
    .filter(([, value]) => typeof value !== 'undefined');

  return entries.length > 0 ? Object.fromEntries(entries) as Record<string, SchemaValue> : undefined;
}

function mapExecutionResult(result: ActionResult, resultPath: string | undefined): SQLResultState {
  if (!result.ok || result.data == null) {
    return {
      status: 'error',
      message: result.error ? String(result.error) : 'Execution returned no data'
    };
  }

  let data: unknown = result.data;
  if (resultPath) {
    const parts = resultPath.split('.');
    for (const key of parts) {
      if (data == null || typeof data !== 'object') {
        data = undefined;
        break;
      }
      data = (data as Record<string, unknown>)[key];
    }
  }

  if (Array.isArray(data)) {
    const columns = data.length > 0 ? Object.keys(data[0] as Record<string, unknown>) : [];
    return { status: 'success', data, columns };
  }

  return {
    status: 'success',
    data: [{ result: String(data) }],
    columns: ['result']
  };
}

export function useSQLEditorState(props: CodeEditorRendererProps, sqlConfig: SQLEditorConfig | undefined, view: EditorView | null) {
  const [variablePanelCollapsed, setVariablePanelCollapsed] = useState(false);
  const [sqlResult, setSqlResult] = useState<SQLResultState>({ status: 'idle' });

  const hasSnippets = Boolean(sqlConfig?.snippets?.length);
  const hasVariablePanel = Boolean(sqlConfig?.variablePanel?.enabled);
  const hasExecution = Boolean(sqlConfig?.execution?.enabled);

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
      const executionParams = buildExecutionParams(props, sqlConfig.execution.params);

      let result: ActionResult;
      if (typeof onExecute === 'string') {
        const action: ActionSchema = {
          action: onExecute,
          args: {
            sql: sqlText,
            ...(executionParams ?? {}),
          },
        };
        result = await props.helpers.dispatch(action);
      } else if (onExecute && typeof onExecute === 'object') {
        const action: ActionSchema = {
          action: 'ajax',
          args: {
            ...(onExecute as ApiSchema),
            params: {
              ...(((onExecute as ApiSchema).params as Record<string, SchemaValue> | undefined) ?? {}),
              ...(executionParams ?? {}),
            },
            data: {
              ...(((onExecute as ApiSchema).data as Record<string, unknown> | undefined) ?? {}),
              sql: sqlText,
            },
          },
        };
        result = await props.helpers.dispatch(action);
      } else {
        const action: ActionSchema = {
          action: 'ajax',
          args: {
            url: '/api/report/execSql',
            method: 'POST',
            params: executionParams,
            data: { sql: sqlText },
          },
        };
        result = await props.helpers.dispatch(action);
      }

      setSqlResult(mapExecutionResult(result, sqlConfig.execution.resultPath));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSqlResult({ status: 'error', message });
    }
  }, [props.helpers, sqlConfig, view]);

  const handleClearResult = useCallback(() => {
    setSqlResult({ status: 'idle' });
  }, []);

  return {
    hasSnippets,
    hasVariablePanel,
    hasExecution,
    variablePanelCollapsed,
    setVariablePanelCollapsed,
    sqlResult,
    insertAtCursor,
    handleFormatSQL,
    handleExecuteSQL,
    handleClearResult
  };
}
