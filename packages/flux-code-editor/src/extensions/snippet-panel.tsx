import { useCallback } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@nop-chaos/ui';
import type { CodeSnippetTemplate } from '../types';

interface SnippetPanelProps {
  snippets: CodeSnippetTemplate[];
  onInsert: (template: string) => void;
}

export function SnippetPanel({ snippets, onInsert }: SnippetPanelProps) {
  const handleSelect = useCallback(
    (template: string) => {
      onInsert(template);
    },
    [onInsert],
  );

  if (snippets.length === 0) return null;

  return (
    <Popover>
      <div data-slot="code-editor-snippet-panel">
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              data-slot="code-editor-snippet-toggle"
              title="Insert snippet"
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              {'{…}'}
            </Button>
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
