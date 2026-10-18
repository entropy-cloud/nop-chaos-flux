import { useEffect, useMemo, useState } from 'react';
import type { TableColumnSchema, TableResponsiveConfig, TableSchema } from '../schemas.js';
import { hasNestedColumns } from './table-header-tree.js';

const EMPTY_RESPONSIVE_COLUMNS: TableColumnSchema[] = [];

const RESPONSIVE_BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
} as const;

export function resolveResponsiveBreakpoint(breakpoint: TableResponsiveConfig['breakpoint']) {
  if (typeof breakpoint === 'number' && Number.isFinite(breakpoint) && breakpoint > 0) {
    return breakpoint;
  }

  if (typeof breakpoint === 'string') {
    return (
      RESPONSIVE_BREAKPOINTS[breakpoint as keyof typeof RESPONSIVE_BREAKPOINTS] ??
      RESPONSIVE_BREAKPOINTS.md
    );
  }

  return RESPONSIVE_BREAKPOINTS.md;
}

export function splitResponsiveColumns(columns: TableColumnSchema[]) {
  // FM-024: identity keys must be computed in a single index space. The old
  // two-pass version named unnamed fixed columns by their fixed-side subset
  // index but matched them by full-array index, so any misalignment folded
  // the fixed (operations) column into hiddenColumns — breaking the mobile
  // "fixed column never hides" guarantee.
  let leftIndex = 0;
  let rightIndex = 0;
  const keys = columns.map((column) => {
    if (column.name) return column.name;
    if (column.fixed === 'left') return `left-${leftIndex++}`;
    if (column.fixed === 'right') return `right-${rightIndex++}`;
    return '__primary__';
  });

  const primaryColumn = columns.find(
    (column) => column.fixed !== 'left' && column.fixed !== 'right',
  );

  const primaryColumnNames = new Set<string>();
  columns.forEach((column, index) => {
    if (column.fixed === 'left' || column.fixed === 'right' || column === primaryColumn) {
      primaryColumnNames.add(keys[index]!);
    }
  });

  const primaryColumns = columns.filter((_, index) => primaryColumnNames.has(keys[index]!));
  const hiddenColumns = columns.filter((column) => !primaryColumns.includes(column));

  return {
    primaryColumns: primaryColumns.length > 0 ? primaryColumns : columns.slice(0, 1),
    hiddenColumns,
  };
}

export function useIsBelowResponsiveBreakpoint(breakpoint: number) {
  const [isBelow, setIsBelow] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const update = () => {
      setIsBelow(window.innerWidth < breakpoint);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);

  return isBelow;
}

export function useResponsiveExpandState(
  tableSchemaProps: TableSchema,
  tableColumns: TableColumnSchema[],
) {
  const responsiveBreakpoint = resolveResponsiveBreakpoint(tableSchemaProps.responsive?.breakpoint);
  const isBelowResponsiveBreakpoint = useIsBelowResponsiveBreakpoint(responsiveBreakpoint);
  const responsiveExpandActive =
    tableSchemaProps.responsive?.mode === 'expand' && isBelowResponsiveBreakpoint;
  // P1-2: responsive.defaultExpanded — when expand mode is active and the flag
  // is set, all detail rows start expanded. The same local set drives toggles
  // with inverted semantics: membership = "collapsed override" (expandAllByDefault
  // true) vs "expanded" (normal mode), so user collapse/expand still works.
  const expandAllByDefault =
    responsiveExpandActive && tableSchemaProps.responsive?.defaultExpanded === true;
  const responsiveColumns = useMemo(() => splitResponsiveColumns(tableColumns), [tableColumns]);
  const mainColumns = responsiveExpandActive ? responsiveColumns.primaryColumns : tableColumns;
  const responsiveHiddenColumns = responsiveExpandActive
    ? responsiveColumns.hiddenColumns
    : EMPTY_RESPONSIVE_COLUMNS;
  const nestedHeadersActive = !responsiveExpandActive && hasNestedColumns(mainColumns);

  return {
    responsiveExpandActive,
    expandAllByDefault,
    mainColumns,
    responsiveHiddenColumns,
    nestedHeadersActive,
  };
}
