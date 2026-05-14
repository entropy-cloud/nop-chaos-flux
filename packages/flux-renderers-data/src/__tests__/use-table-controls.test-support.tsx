import React from 'react';
import { vi } from 'vitest';
import {
  useTableExpand,
  useTableFilter,
  useTablePagination,
  useTableSelection,
  useTableSort,
} from '../table-renderer/use-table-controls.js';

export const mockScopeState: { data: Record<string, unknown> } = {
  data: {},
};
export const renderScopeUpdate = vi.fn();

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: renderScopeUpdate }),
  useScopeSelector: (selector: (value: Record<string, unknown>) => unknown) =>
    selector(mockScopeState.data),
}));

export function resetTableControlTestState() {
  mockScopeState.data = {};
  renderScopeUpdate.mockReset();
}

export function createHelpers() {
  return {
    createScope: vi.fn((value: unknown, options?: unknown) => ({ value, options })),
  } as any;
}

export function PaginationProbe(props: {
  schemaProps: any;
  onPageChange?: any;
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTablePagination(
    props.schemaProps,
    props.onPageChange,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

export function SelectionProbe(props: {
  schemaProps: any;
  source: Array<Record<string, any>>;
  onSelectionChange?: any;
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTableSelection(
    props.schemaProps,
    props.source,
    props.onSelectionChange,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

export function SortProbe(props: {
  schemaProps: any;
  onSortChange?: any;
  columns: any[];
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTableSort(
    props.schemaProps,
    props.onSortChange,
    props.columns,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

export function FilterProbe(props: {
  schemaProps: any;
  onFilterChange?: any;
  helpers?: any;
  onFilterStateChange?: any;
  onReady: (value: any) => void;
}) {
  const api = useTableFilter(
    props.schemaProps,
    props.onFilterChange,
    props.helpers ?? createHelpers(),
    props.onFilterStateChange,
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

export function ExpandProbe(props: { schemaProps: any; onReady: (value: any) => void }) {
  const api = useTableExpand(props.schemaProps);
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}
