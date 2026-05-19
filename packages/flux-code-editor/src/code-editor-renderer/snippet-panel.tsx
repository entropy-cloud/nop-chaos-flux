
import { Button, Popover, PopoverContent, PopoverTrigger } from '@nop-chaos/ui';
import type { CodeSnippetTemplate } from '../types.js';
import { ToolbarButton } from './toolbar-button.js';

interface SnippetPanelProps {
  snippets: CodeSnippetTemplate[];
  onInsert: (template: string) => void;
}

export function SnippetPanel({ snippets, onInsert }: SnippetPanelProps) {
  const handleSelect = (template: string) => {
      onInsert(template);
    };

  if (snippets.length === 0) return null;

  return (
    <Popover>
      <div data-slot="code-editor-snippet-panel">
        <PopoverTrigger
          nativeButton={false}
          render={
            <ToolbarButton
              size="xs"
              data-slot="code-editor-snippet-toggle"
              title="Insert snippet"
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              {'{…}'}
            </ToolbarButton>
          }
        />
      </div>
      <PopoverContent align="start" className="w-48 p-1" data-slot="code-editor-snippet-dropdown">
        {snippets.map((snippet, index) => (
          <Button
            key={snippet.name || snippet.template || `snippet-${index}`}
            variant="ghost"
            size="xs"
            className="w-full justify-start gap-2"
            data-slot="code-editor-snippet-item"
            title={snippet.description}
            onClick={() => handleSelect(snippet.template)}
          >
            {snippet.icon && <span>{snippet.icon}</span>}
            <span>{snippet.name}</span>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
