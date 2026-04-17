import type { ReactNode } from 'react';
import { Button, ScrollArea } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
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
      <div data-slot="code-editor-var-panel" data-collapsed="">
        <Button
          variant="ghost"
          size="icon-xs"
          data-slot="code-editor-var-panel-toggle"
          onClick={onToggleCollapse}
          title={t('flux.codeEditor.expandVariablePanel')}
          aria-label={t('flux.codeEditor.expandVariablePanel')}
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
    <div data-slot="code-editor-var-panel">
      <div data-slot="code-editor-var-panel-header">
        <span data-slot="code-editor-var-panel-title">{t('flux.codeEditor.variables')}</span>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon-xs"
            data-slot="code-editor-var-panel-toggle"
            onClick={onToggleCollapse}
            title={t('flux.codeEditor.collapseVariablePanel')}
            aria-label={t('flux.codeEditor.collapseVariablePanel')}
          >
            <ChevronLeftIcon />
          </Button>
        )}
      </div>
      <ScrollArea data-slot="code-editor-var-panel-list">
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
    <div key={variable.value} data-slot="code-editor-var-item" style={{ paddingLeft: depth * 12 }}>
      <div data-slot="code-editor-var-item-main">
        <span data-slot="code-editor-var-item-label">{variable.label}</span>
        <span data-slot="code-editor-var-item-value">{variable.value}</span>
      </div>
      <div data-slot="code-editor-var-item-actions">
        <Button
          variant="ghost"
          size="icon-xs"
          data-slot="code-editor-var-item-copy"
          onClick={() => onCopy(variable)}
          title="Copy to clipboard"
          aria-label="Copy to clipboard"
        >
          <CopyIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          data-slot="code-editor-var-item-insert"
          onClick={() => onInsert(variable)}
          title="Insert at cursor"
          aria-label="Insert at cursor"
        >
          <CornerDownRightIcon />
        </Button>
      </div>
      {variable.children && variable.children.length > 0 && (
        <div data-slot="code-editor-var-item-children">
          {renderVariableList(variable.children, onInsert, onCopy, depth + 1)}
        </div>
      )}
    </div>
  ));
}
