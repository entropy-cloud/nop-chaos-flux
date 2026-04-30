import { t } from '@nop-chaos/flux-i18n';
import { ChevronDownIcon, ChevronRightIcon, Maximize2Icon, PlayIcon } from 'lucide-react';
import { SnippetPanel } from '../extensions/snippet-panel';
import { ToolbarButton } from './toolbar-button';
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
  onEnterFullscreen,
}: CodeEditorToolbarProps) {
  return (
    <div data-slot="code-editor-toolbar">
      {language === 'sql' && (
        <>
          {formatConfig && (
            <ToolbarButton
              size="xs"
              data-slot="code-editor-toolbar-format"
              onClick={onFormatSQL}
              title={t('flux.codeEditor.formatSQL')}
            >
              {t('flux.codeEditor.format')}
            </ToolbarButton>
          )}
          {snippets?.length ? (
            <SnippetPanel snippets={snippets} onInsert={onInsertSnippet} />
          ) : null}
          {hasVariablePanel && (
            <ToolbarButton
              size="xs"
              data-slot="code-editor-toolbar-var-toggle"
              onClick={onToggleVariables}
              title={
                variablePanelCollapsed
                  ? t('flux.codeEditor.showVariables')
                  : t('flux.codeEditor.hideVariables')
              }
            >
              {variablePanelCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
              {t('flux.codeEditor.vars')}
            </ToolbarButton>
          )}
          {hasExecution && (
            <ToolbarButton
              size="xs"
              data-slot="code-editor-toolbar-execute"
              onClick={onExecuteSQL}
              title={t('flux.codeEditor.executeSQL')}
            >
              <PlayIcon />
              {t('flux.codeEditor.run')}
            </ToolbarButton>
          )}
        </>
      )}
      {allowFullscreen && !isFullscreen && (
        <ToolbarButton
          data-slot="code-editor-toolbar-fullscreen"
          onClick={onEnterFullscreen}
          aria-label="Enter fullscreen"
          title="Fullscreen"
        >
          <Maximize2Icon />
        </ToolbarButton>
      )}
    </div>
  );
}
