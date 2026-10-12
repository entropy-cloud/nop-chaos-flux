import { useState, useEffect, useRef } from 'react';
import { Search, ArrowLeft, ArrowRight, X, ReplaceAll } from 'lucide-react';
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core';
import { t } from '@nop-chaos/flux-i18n';
import { useRendererRuntimeOrNull } from '@nop-chaos/flux-react';
import { Button, Input } from '@nop-chaos/ui';
import { ToolbarButton, ToolbarSeparator } from './shared.js';
import { invokeCanvasCommand } from './invoke-canvas-command.js';

interface SearchReplaceProps {
  bridge: CanvasEditorBridge | null;
  visible: boolean;
  onClose: () => void;
}

export function SearchReplace({ bridge, visible, onClose }: SearchReplaceProps) {
  const env = useRendererRuntimeOrNull()?.env;
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchText) {
      invokeCanvasCommand(env, () => bridge?.command?.executeSearch(null));
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      invokeCanvasCommand(env, () => bridge?.command?.executeSearch(searchText));
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, bridge, env]);

  const handlePrev = () => {
    invokeCanvasCommand(env, () => bridge?.command?.executeSearchNavigatePre());
  };

  const handleNext = () => {
    invokeCanvasCommand(env, () => bridge?.command?.executeSearchNavigateNext());
  };

  const handleReplace = () => {
    invokeCanvasCommand(env, () => bridge?.command?.executeReplace(replaceText));
  };

  const handleClose = () => {
    setSearchText('');
    setReplaceText('');
    invokeCanvasCommand(env, () => bridge?.command?.executeSearch(null));
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-1 border-l bg-muted/40 p-2">
      <div className="flex items-center gap-1 flex-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t('flux.wordEditor.searchPlaceholder')}
            size="sm"
            className="pl-7 w-32"
          />
        </div>
        <ToolbarButton
          icon={ArrowLeft}
          onClick={handlePrev}
          disabled={!searchText}
          title="flux.wordEditor.previous"
          testId="search-previous"
        />
        <ToolbarButton
          icon={ArrowRight}
          onClick={handleNext}
          disabled={!searchText}
          title="flux.wordEditor.next"
          testId="search-next"
        />
      </div>
      <ToolbarSeparator />
      <div className="flex items-center gap-1 flex-1">
        <div className="relative">
          <ReplaceAll className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder={t('flux.wordEditor.replacePlaceholder')}
            size="sm"
            className="pl-7 w-32"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleReplace}
          disabled={!searchText}
        >
          {t('flux.wordEditor.replace')}
        </Button>
      </div>
      <ToolbarSeparator />
      <ToolbarButton icon={X} onClick={handleClose} title="flux.wordEditor.close" testId="search-close" />
    </div>
  );
}
