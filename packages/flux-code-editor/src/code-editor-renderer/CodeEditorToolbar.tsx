import { Button } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon, Maximize2Icon, PlayIcon } from 'lucide-react';
import { SnippetPanel } from '../extensions/snippet-panel';
import type { CodeSnippetTemplate, SQLFormatConfig } from '../types';

interface CodeEditorToolbarProps {
  language: string;
  allowFullscreen: boolean;
  isFullscreen: boolean;
  formatConfig: SQLFormatConfig | undefined;
  snippets?: CodeSnippetTemplate[];
  hasVariablePanel: boolean;
  hasExecution: boolean;
  variablePanelCollapsed: boolean;
  onFormatSQL: () => void;
  onInsertSnippet: (text: string) => void;
  onToggleVariables: () => void;
  onExecuteSQL: () => void;
  onEnterFullscreen: () => void;
}

export function CodeEditorToolbar({
  language,
  allowFullscreen,
  isFullscreen,
  formatConfig,
  snippets,
  hasVariablePanel,
  hasExecution,
  variablePanelCollapsed,
  onFormatSQL,
  onInsertSnippet,
  onToggleVariables,
  onExecuteSQL,
  onEnterFullscreen
}: CodeEditorToolbarProps) {
  return (
    <div data-slot="code-editor-toolbar">
      {language === 'sql' && (
        <>
          {formatConfig && (
            <Button
              variant="ghost"
              size="xs"
              data-slot="code-editor-toolbar-format"
              onClick={onFormatSQL}
              title="Format SQL"
            >
              Format
            </Button>
          )}
          {snippets?.length ? <SnippetPanel snippets={snippets} onInsert={onInsertSnippet} /> : null}
          {hasVariablePanel && (
            <Button
              variant="ghost"
              size="xs"
              data-slot="code-editor-toolbar-var-toggle"
              onClick={onToggleVariables}
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
              data-slot="code-editor-toolbar-execute"
              onClick={onExecuteSQL}
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
          data-slot="code-editor-toolbar-fullscreen"
          onClick={onEnterFullscreen}
          aria-label="Enter fullscreen"
          title="Fullscreen"
        >
          <Maximize2Icon />
        </Button>
      )}
    </div>
  );
}
