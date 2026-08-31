import { useEffect, useMemo, useState } from 'react';
import type { TableSchema } from '../schemas.js';
import type { TableRowEntry } from './types.js';
import {
  buildGroupedDisplayItems,
  buildTableGroups,
  resolveTableGroupConfig,
  type GroupedDisplayItem,
} from './table-grouping.js';
import { warnOnce } from './warn-once.js';
import { isDevRuntime } from './use-table-tree.js';

interface UseTableGroupingInput {
  tableSchemaProps: TableSchema;
  draggable: boolean;
  treeMode: boolean;
  treeFlattenedData: TableRowEntry[];
}

/**
 * D1 G-D grouping model (decision 1): resolve the group declaration, build the
 * group model over the sorted/filtered rows, interleave the display sequence,
 * own the collapse-key set and the one-time gd-* dev warns. Group precedence:
 * inert under tree mode; drag-sort ordering suppressed while grouped.
 */
export function useTableGrouping(input: UseTableGroupingInput) {
  const { tableSchemaProps, draggable, treeMode, treeFlattenedData } = input;

  const groupConfig = useMemo(
    () => (treeMode ? undefined : resolveTableGroupConfig(tableSchemaProps.group)),
    [tableSchemaProps.group, treeMode],
  );
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set());
  const handleToggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };
  const groupModel = useMemo(
    () => (groupConfig ? buildTableGroups(treeFlattenedData, groupConfig) : null),
    [groupConfig, treeFlattenedData],
  );
  const groupedDisplayItems = useMemo(
    () => (groupModel ? buildGroupedDisplayItems(groupModel, collapsedGroupKeys) : null),
    [groupModel, collapsedGroupKeys],
  );
  const dragSortActive = draggable === true && !groupConfig;

  useEffect(() => {
    if (!isDevRuntime()) {
      return;
    }
    if (treeMode && tableSchemaProps.group) {
      warnOnce(
        'gd-group-tree-clash',
        '[flux:table] gd-group-tree-clash: group is inert under tree mode (tree structure takes precedence).',
      );
    }
    if (groupConfig && draggable === true) {
      warnOnce(
        'gd-group-drag-clash',
        '[flux:table] gd-group-drag-clash: display order follows grouping; row drag-sort ordering is not applied while grouping is active.',
      );
    }
    if (groupModel?.some((group) => group.missing)) {
      warnOnce(
        'gd-group-missing-field',
        '[flux:table] gd-group-missing-field: rows with missing/null/empty group field values were routed into the fallback group.',
      );
    }
    if (groupModel?.some((group) => group.aggregates.some((aggregate) => !aggregate.valid))) {
      warnOnce(
        'gd-aggregate-no-valid-values',
        '[flux:table] gd-aggregate-no-valid-values: an aggregate has no valid numeric member and renders "-".',
      );
    }
  }, [draggable, groupConfig, groupModel, tableSchemaProps.group, treeMode]);

  return { groupConfig, dragSortActive, groupedDisplayItems, handleToggleGroupCollapse };
}

interface UseGroupedPageDataInput {
  groupedDisplayItems: GroupedDisplayItem[] | null;
  paginationEnabled: boolean;
  serverPaged: boolean;
  resolvedCurrentPage: number;
  pageSize: number;
}

export interface GroupedPageData {
  /** Interleaved page slice (headers + member rows) for body rendering. */
  items: GroupedDisplayItem[];
  /** Member rows of the page slice — feeds selection/index math. */
  rows: TableRowEntry[];
}

/**
 * D1 G-D page slice: pagination covers the interleaved display sequence
 * (headers consume page slots; a page-leading header may render with zero
 * members); the rows-only view feeds selection/index math.
 */
export function useGroupedPageData(input: UseGroupedPageDataInput): GroupedPageData | null {
  const { groupedDisplayItems, paginationEnabled, serverPaged, resolvedCurrentPage, pageSize } =
    input;

  return useMemo(() => {
    if (!groupedDisplayItems) {
      return null;
    }
    const slice =
      paginationEnabled && !serverPaged
        ? groupedDisplayItems.slice(
            (resolvedCurrentPage - 1) * pageSize,
            (resolvedCurrentPage - 1) * pageSize + pageSize,
          )
        : groupedDisplayItems;
    const rows: TableRowEntry[] = [];
    const items: GroupedDisplayItem[] = [];
    let viewIndex = 0;
    for (const item of slice) {
      if (item.kind === 'row') {
        const entry: TableRowEntry = { ...item.entry, viewIndex: viewIndex++ };
        rows.push(entry);
        items.push({ kind: 'row', entry, groupKey: item.groupKey });
      } else {
        items.push(item);
      }
    }
    return { items, rows };
  }, [groupedDisplayItems, paginationEnabled, serverPaged, resolvedCurrentPage, pageSize]);
}
