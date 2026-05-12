import { VariablePanel } from '../variable-panel.js';
import type { VariableItem } from '../types.js';

interface SQLEditorBodyProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  hasVariablePanel: boolean;
  variablePanelCollapsed: boolean;
  sqlVariables: VariableItem[];
  insertTemplate: string | undefined;
  onInsertVariable: (text: string) => void;
  onToggleVariablePanel: () => void;
}

export function SQLEditorBody({
  editorRef,
  isFullscreen,
  hasVariablePanel,
  variablePanelCollapsed,
  sqlVariables,
  insertTemplate,
  onInsertVariable,
  onToggleVariablePanel,
}: SQLEditorBodyProps) {
  return (
    <div
      data-slot={hasVariablePanel ? 'code-editor-body' : undefined}
      style={hasVariablePanel ? { display: 'flex', flex: 1, minHeight: 0 } : undefined}
    >
      <div
        ref={editorRef}
        style={
          isFullscreen
            ? { flex: 1, overflow: 'auto' }
            : hasVariablePanel
              ? { flex: 1, minHeight: 0 }
              : undefined
        }
      />
      {hasVariablePanel && (
        <VariablePanel
          variables={sqlVariables}
          insertTemplate={insertTemplate}
          onInsert={onInsertVariable}
          collapsed={variablePanelCollapsed}
          onToggleCollapse={onToggleVariablePanel}
        />
      )}
    </div>
  );
}
