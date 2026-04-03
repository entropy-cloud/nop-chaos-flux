import { useCallback } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@nop-chaos/ui';
import type { CodeSnippetTemplate } from '../types';

interface SnippetPanelProps {
  snippets: CodeSnippetTemplate[];
  onInsert: (template: string) => void;
}

export function SnippetPanel({ snippets, onInsert }: SnippetPanelProps) {
  const handleSelect = useCallback((template: string) => {
    onInsert(template);
  }, [onInsert]);

  if (snippets.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="xs" title="Insert snippet">
            {'{…}'}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-48 p-1">
        {snippets.map((snippet, i) => (
          <Button
            key={i}
            variant="ghost"
            size="xs"
            className="w-full justify-start gap-2"
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
