import type { ReactNode } from 'react';
import { Button, ScrollArea } from '@nop-chaos/ui';
import { ChevronRightIcon, ChevronLeftIcon, CopyIcon, CornerDownRightIcon } from 'lucide-react';
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
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleCollapse}
          title="Expand variable panel"
          aria-label="Expand variable panel"
        >
          <ChevronRightIcon />
        </Button>
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
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapse}
            title="Collapse variable panel"
            aria-label="Collapse variable panel"
          >
            <ChevronLeftIcon />
          </Button>
        )}
      </div>
      <ScrollArea className="nop-code-editor__var-panel-list">
        {renderVariableList(variables, handleInsert, handleCopy)}
      </ScrollArea>
    </div>
  );
}

function renderVariableList(
  variables: VariableItem[],
  onInsert: (variable: VariableItem) => void,
  onCopy: (variable: VariableItem) => void,
  depth = 0,
): ReactNode {
  return variables.map((variable) => (
    <div key={variable.value} className="nop-code-editor__var-item" style={{ paddingLeft: depth * 12 }}>
      <div className="nop-code-editor__var-item-main">
        <span className="nop-code-editor__var-item-label">{variable.label}</span>
        <span className="nop-code-editor__var-item-value">{variable.value}</span>
      </div>
      <div className="nop-code-editor__var-item-actions">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onCopy(variable)}
          title="Copy to clipboard"
          aria-label="Copy to clipboard"
        >
          <CopyIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onInsert(variable)}
          title="Insert at cursor"
          aria-label="Insert at cursor"
        >
          <CornerDownRightIcon />
        </Button>
      </div>
      {variable.children && variable.children.length > 0 && (
        <div className="nop-code-editor__var-item-children">
          {renderVariableList(variable.children, onInsert, onCopy, depth + 1)}
        </div>
      )}
    </div>
  ));
}
