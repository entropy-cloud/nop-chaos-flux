import { useCallback, useState } from 'react';
import type { TableSchema } from '../schemas.js';

export function useTableExpand(schemaProps: TableSchema) {
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(
    new Set(schemaProps.expandable?.expandedRowKeys ?? []),
  );

  const handleToggleExpand = useCallback((rowKey: string) => {
    setExpandedRowKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  }, []);

  return { expandedRowKeys, handleToggleExpand };
}
