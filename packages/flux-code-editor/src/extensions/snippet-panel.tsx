import { useState, useRef, useEffect, useCallback } from 'react';
import type { CodeSnippetTemplate } from '../types';

interface SnippetPanelProps {
  snippets: CodeSnippetTemplate[];
  onInsert: (template: string) => void;
}

export function SnippetPanel({ snippets, onInsert }: SnippetPanelProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = useCallback((template: string) => {
    onInsert(template);
    setOpen(false);
  }, [onInsert]);

  const handleToggle = useCallback(() => {
    setOpen(v => !v);
  }, []);

  const handleToggleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(v => !v);
    }
  }, []);

  if (snippets.length === 0) return null;

  return (
    <div ref={containerRef} className="nop-code-editor__snippet-panel">
      <span
        role="button"
        tabIndex={0}
        className="nop-code-editor__snippet-toggle"
        onClick={handleToggle}
        onKeyDown={handleToggleKeyDown}
        title="Insert snippet"
      >
        {'{\u2026}'}
      </span>
      {open && (
        <div className="nop-code-editor__snippet-dropdown">
          {snippets.map((snippet, i) => (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className="nop-code-editor__snippet-item"
              onClick={() => handleSelect(snippet.template)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(snippet.template);
                }
              }}
              title={snippet.description}
            >
              {snippet.icon && <span className="nop-code-editor__snippet-icon">{snippet.icon}</span>}
              <span className="nop-code-editor__snippet-name">{snippet.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
