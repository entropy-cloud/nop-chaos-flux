import { useCallback } from 'react';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DatasetSourceType,
  DataColumnInput,
  EditorStoreApi,
} from '@nop-chaos/word-editor-core';
import type { Dataset, DocChart, DocCode } from '@nop-chaos/word-editor-core';
import { validateDocChart, validateDocCode } from '@nop-chaos/word-editor-core';
import { findInsertableTagDefinition } from '../template-tag-helpers.js';

interface UseWordEditorActionsParams {
  bridge: CanvasEditorBridge;
  datasetStore: DatasetStoreApi;
  editorStore: EditorStoreApi;
  editingDatasetId: string | null;
  setDatasetDialogOpen: (value: boolean) => void;
  setEditingDatasetId: (value: string | null) => void;
  onBack?: (event: React.MouseEvent<HTMLButtonElement>) => unknown;
}

export function useWordEditorActions({
  bridge,
  datasetStore,
  editorStore,
  editingDatasetId,
  setDatasetDialogOpen,
  setEditingDatasetId,
  onBack,
}: UseWordEditorActionsParams) {
  const handleBack = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      void onBack?.(event);
    },
    [onBack],
  );

  const handleAddDataset = () => {
    setEditingDatasetId(null);
    setDatasetDialogOpen(true);
  };

  const handleEditDataset = (datasetId: string) => {
    setEditingDatasetId(datasetId);
    setDatasetDialogOpen(true);
  };

  const handleSaveDataset = useCallback(
    (data: {
      name: string;
      description: string;
      type: DatasetSourceType;
      columns: DataColumnInput[];
    }) => {
      const datasetData: Omit<Dataset, 'id'> = {
        name: data.name,
        description: data.description,
        type: data.type,
        columns: data.columns.map((col) => ({
          name: col.name ?? '',
          label: col.label ?? '',
          description: col.description,
          type: (col.type as DatasetSourceType) ?? 'static',
        })),
      };
      if (editingDatasetId) {
        datasetStore.update(editingDatasetId, datasetData);
      } else {
        datasetStore.add(datasetData);
      }
      editorStore.setDirty(true);
      setDatasetDialogOpen(false);
      setEditingDatasetId(null);
    },
    [editingDatasetId, datasetStore, editorStore, setDatasetDialogOpen, setEditingDatasetId],
  );

  const handleFieldClick = useCallback(
    (datasetName: string, columnName: string) => {
      bridge.insertFieldExpression(datasetName, columnName);
    },
    [bridge],
  );

  const handleInsertExpr = useCallback(
    (expr: string) => {
      bridge.insertTemplateExpression({
        kind: 'el',
        expr: expr.replace(/^\$\{/, '').replace(/\}$/, ''),
      });
    },
    [bridge],
  );

  const handleInsertTag = useCallback(
    (tagName: string) => {
      const tagDef = findInsertableTagDefinition(tagName);
      if (!tagDef) {
        return;
      }
      bridge.insertTemplateExpression({
        kind: tagDef.kind,
        expr: '',
        tagName,
        attrs: tagDef.defaultAttrs,
      });
    },
    [bridge],
  );

  const handleChartSave = useCallback(
    (_chart: DocChart) => {
      if (!validateDocChart(_chart).valid) {
        return;
      }
      bridge.insertChart(_chart);
    },
    [bridge],
  );

  const handleCodeSave = useCallback(
    (_code: DocCode) => {
      if (!validateDocCode(_code).valid) {
        return;
      }
      bridge.insertCode(_code);
    },
    [bridge],
  );

  return {
    handleBack,
    handleAddDataset,
    handleEditDataset,
    handleSaveDataset,
    handleFieldClick,
    handleInsertExpr,
    handleInsertTag,
    handleChartSave,
    handleCodeSave,
  };
}
