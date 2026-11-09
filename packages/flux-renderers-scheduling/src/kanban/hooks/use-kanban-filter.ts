import { useState, useCallback } from 'react';
import { useDebouncedValue } from '@nop-chaos/flux-react';

export interface UseKanbanFilterOptions {
  filterText?: string;
  filterCard?: (card: Record<string, any>, text: string) => boolean;
  debounceMs?: number;
}

export function useKanbanFilter({ filterText: externalFilterText, filterCard, debounceMs = 300 }: UseKanbanFilterOptions) {
  const [localText, setLocalText] = useState(externalFilterText ?? '');
  // A changed external filter replaces the local draft (render-time adjust,
  // React "storing information from previous renders").
  const [syncedExternalText, setSyncedExternalText] = useState(externalFilterText);
  if (syncedExternalText !== externalFilterText) {
    setSyncedExternalText(externalFilterText);
    setLocalText(externalFilterText ?? '');
  }

  const activeText = useDebouncedValue(localText, debounceMs);

  const matchesCard = useCallback((card: Record<string, any>): boolean => {
    const text = activeText;
    if (!text) return true;
    if (filterCard) {
      return filterCard(card, text);
    }
    const title = ((card.data?.title ?? card.title ?? '') as string).toLowerCase();
    const description = ((card.data?.description ?? card.description ?? '') as string).toLowerCase();
    const query = text.toLowerCase();
    return title.includes(query) || description.includes(query);
  }, [filterCard, activeText]);

  return {
    filterText: localText,
    setFilterText: setLocalText,
    activeFilterText: activeText,
    matchesCard,
  };
}


