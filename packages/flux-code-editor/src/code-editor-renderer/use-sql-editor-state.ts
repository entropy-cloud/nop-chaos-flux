import { useCallback, useState } from 'react';
import type { ActionResult, ActionSchema, ApiObject } from '@nop-chaos/flux-core';
import type { EditorView } from '@codemirror/view';
import { formatSQL } from '../extensions/sql/format';
import type { SQLResultState } from '../sql-result-panel';
import type { SQLEditorConfig } from '../types';
import type { CodeEditorRendererProps } from './shared';

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

      let result: ActionResult;
      if (typeof onExecute === 'string') {
        const action: ActionSchema = {
          action: onExecute,
          args: { sql: sqlText },
        };
        result = await props.helpers.dispatch(action);
      } else if (onExecute && typeof onExecute === 'object') {
        const action: ActionSchema = {
          action: 'ajax',
          api: {
            ...(onExecute as ApiObject),
            data: { sql: sqlText },
          },
        };
        result = await props.helpers.dispatch(action);
      } else {
        const action: ActionSchema = {
          action: 'ajax',
          api: {
            url: '/api/report/execSql',
            method: 'POST',
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
