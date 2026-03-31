import type { VariableItem } from './types';
import { renderInsertTemplate } from './types';

interface VariablePanelProps {
  variables: VariableItem[];
  insertTemplate?: string;
  onInsert: (text: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function VariablePanel({
  variables,
  insertTemplate,
  onInsert,
  collapsed = false,
  onToggleCollapse,
}: VariablePanelProps) {
  if (collapsed) {
    return (
      <div className="nop-code-editor__var-panel nop-code-editor__var-panel--collapsed">
        <span
          role="button"
          tabIndex={0}
          className="nop-code-editor__var-panel-toggle"
          onClick={onToggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse?.(); }
          }}
          title="Expand variable panel"
        >
          {'▶'}
        </span>
      </div>
    );
  }

  const handleCopy = async (variable: VariableItem) => {
    try {
      await navigator.clipboard.writeText(variable.value);
    } catch {
      // clipboard API not available
    }
  };

  const handleInsert = (variable: VariableItem) => {
    const text = insertTemplate
      ? renderInsertTemplate(insertTemplate, variable)
      : variable.value;
    onInsert(text);
  };

  return (
    <div className="nop-code-editor__var-panel">
      <div className="nop-code-editor__var-panel-header">
        <span className="nop-code-editor__var-panel-title">Variables</span>
        {onToggleCollapse && (
          <span
            role="button"
            tabIndex={0}
            className="nop-code-editor__var-panel-toggle"
            onClick={onToggleCollapse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(); }
            }}
            title="Collapse variable panel"
          >
            {'◀'}
          </span>
        )}
      </div>
      <div className="nop-code-editor__var-panel-list">
        {renderVariableList(variables, handleInsert, handleCopy)}
      </div>
    </div>
  );
}

function renderVariableList(
  variables: VariableItem[],
  onInsert: (variable: VariableItem) => void,
  onCopy: (variable: VariableItem) => void,
  depth = 0,
): React.ReactNode {
  return variables.map((variable) => (
    <div key={variable.value} className="nop-code-editor__var-item" style={{ paddingLeft: depth * 12 }}>
      <div className="nop-code-editor__var-item-main">
        <span className="nop-code-editor__var-item-label">{variable.label}</span>
        <span className="nop-code-editor__var-item-value">{variable.value}</span>
      </div>
      <div className="nop-code-editor__var-item-actions">
        <span
          role="button"
          tabIndex={0}
          className="nop-code-editor__var-item-copy"
          onClick={() => onCopy(variable)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy(variable); }
          }}
          title="Copy to clipboard"
        >
          Copy
        </span>
        <span
          role="button"
          tabIndex={0}
          className="nop-code-editor__var-item-insert"
          onClick={() => onInsert(variable)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInsert(variable); }
          }}
          title="Insert at cursor"
        >
          Insert
        </span>
      </div>
      {variable.children && variable.children.length > 0 && (
        <div className="nop-code-editor__var-item-children">
          {renderVariableList(variable.children, onInsert, onCopy, depth + 1)}
        </div>
      )}
    </div>
  ));
}
