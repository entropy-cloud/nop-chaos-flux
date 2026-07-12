import { useMemo, useState } from 'react';
import { useIsMobile } from '@nop-chaos/ui';
import type { CrudSchema } from './crud-schema.js';

export interface CrudFilterToggleResult {
  enabled: boolean;
  collapsed: boolean;
  activeFilterCount: number;
  setCollapsed: (collapsed: boolean) => void;
}

export function useCrudFilterToggle(
  normalizedSchema: CrudSchema,
  queryState: Record<string, unknown>,
): CrudFilterToggleResult {
  const isMobile = useIsMobile();
  const filterToggleConfig = normalizedSchema.filterTogglable;

  const enabled =
    filterToggleConfig === true ||
    (filterToggleConfig != null && typeof filterToggleConfig === 'object');

  const defaultCollapsed =
    isMobile ||
    (filterToggleConfig != null &&
      typeof filterToggleConfig === 'object' &&
      filterToggleConfig.defaultCollapsed === true);

  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const activeFilterCount = useMemo(
    () =>
      Object.values(queryState).filter((v) => {
        if (v == null) return false;
        if (typeof v === 'string') return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      }).length,
    [queryState],
  );

  return { enabled, collapsed, activeFilterCount, setCollapsed };
}
