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
            <button
              type="button"
              data-slot="code-editor-snippet-toggle"
              title="Insert snippet"
              className="inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring transition-colors"
            >
              {'{…}'}
            </button>
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
