import { VariablePanel } from '../variable-panel';
import type { VariableItem } from '../types';

interface CodeEditorBodyProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  hasVariablePanel: boolean;
  variablePanelCollapsed: boolean;
  sqlVariables: VariableItem[];
  insertTemplate: string | undefined;
  onInsertVariable: (text: string) => void;
  onToggleVariablePanel: () => void;
}

export function CodeEditorBody({
  editorRef,
  isFullscreen,
  hasVariablePanel,
  variablePanelCollapsed,
  sqlVariables,
  insertTemplate,
  onInsertVariable,
  onToggleVariablePanel,
}: CodeEditorBodyProps) {
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
