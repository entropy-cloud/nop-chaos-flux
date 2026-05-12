import type { RefObject } from 'react';
import { useResolvedSQLVariables } from '../source-resolvers.js';
import { SQLResultPanel } from '../sql-result-panel.js';
import { SQLEditorBody } from './sql-editor-body.js';
import { SQLEditorToolbar } from './sql-editor-toolbar.js';
import { useSQLEditorState } from './use-sql-editor-state.js';
import type { CodeEditorRendererProps } from './shared.js';
import type { EditorView } from '@codemirror/view';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { SQLEditorConfig } from '../types.js';
import { resolveFormatConfig } from '../types.js';

export interface UseSQLEditorSlotsOptions {
  props: CodeEditorRendererProps;
  sqlConfig: SQLEditorConfig | undefined;
  scope: ScopeRef;
  view: EditorView | null;
  allowFullscreen: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  editorRef: RefObject<HTMLDivElement | null>;
}

export function useSQLEditorSlots({
  props,
  sqlConfig,
  scope,
  view,
  allowFullscreen,
  isFullscreen,
  toggleFullscreen,
  editorRef,
}: UseSQLEditorSlotsOptions) {
  const {
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

  const sqlVariables = useResolvedSQLVariables(sqlConfig, scope);
  const formatConfig = resolveFormatConfig(sqlConfig);

  return {
    toolbar: (
      <SQLEditorToolbar
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
    ),
    body: (
      <SQLEditorBody
        editorRef={editorRef}
        isFullscreen={isFullscreen}
        hasVariablePanel={hasVariablePanel}
        variablePanelCollapsed={variablePanelCollapsed}
        sqlVariables={sqlVariables}
        insertTemplate={sqlConfig?.variablePanel?.insertTemplate}
        onInsertVariable={insertAtCursor}
        onToggleVariablePanel={() => setVariablePanelCollapsed((value) => !value)}
      />
    ),
    resultPanel:
      hasExecution && sqlConfig?.execution?.showPreview !== false && sqlResult.status !== 'idle' ? (
        <div data-slot="code-editor-result-container">
          <SQLResultPanel result={sqlResult} onClose={handleClearResult} />
        </div>
      ) : null,
  };
}

export function hasSQLToolbarFlags(sqlConfig: SQLEditorConfig | undefined): boolean {
  const formatConfig = resolveFormatConfig(sqlConfig);
  return (
    Boolean(formatConfig) ||
    Boolean(sqlConfig?.snippets?.length) ||
    Boolean(sqlConfig?.variablePanel?.enabled) ||
    Boolean(sqlConfig?.execution?.enabled)
  );
}
