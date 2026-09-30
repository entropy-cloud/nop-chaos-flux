import { useState, useEffect, useCallback } from 'react';
import { useDebouncedValue } from '@nop-chaos/flux-react';

export interface UseKanbanFilterOptions {
  filterText?: string;
  filterCard?: (card: Record<string, any>, text: string) => boolean;
  debounceMs?: number;
}

export function useKanbanFilter({ filterText: externalFilterText, filterCard, debounceMs = 300 }: UseKanbanFilterOptions) {
  const [localText, setLocalText] = useState(externalFilterText ?? '');

  useEffect(() => {
    setLocalText(externalFilterText ?? '');
  }, [externalFilterText]);

  const debouncedValue = useDebouncedValue(localText, debounceMs);
  const [activeText, setActiveText] = useState('');

  useEffect(() => {
    setActiveText(debouncedValue);
  }, [debouncedValue]);

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


