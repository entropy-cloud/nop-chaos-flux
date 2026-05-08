import { useCallback } from 'react';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DatasetSourceType,
  DataColumnInput,
} from '@nop-chaos/word-editor-core';
import type { Dataset, DocChart, DocCode } from '@nop-chaos/word-editor-core';
import { saveDatasets } from '@nop-chaos/word-editor-core';

interface UseWordEditorActionsParams {
  bridge: CanvasEditorBridge;
  datasetStore: DatasetStoreApi;
  editingDatasetId: string | null;
  setDatasetDialogOpen: (value: boolean) => void;
  setEditingDatasetId: (value: string | null) => void;
  setCharts: React.Dispatch<React.SetStateAction<DocChart[]>>;
  setCodes: React.Dispatch<React.SetStateAction<DocCode[]>>;
  onBack?: (event: React.MouseEvent<HTMLButtonElement>) => unknown;
}

export function useWordEditorActions({
  bridge,
  datasetStore,
  editingDatasetId,
  setDatasetDialogOpen,
  setEditingDatasetId,
  setCharts,
  setCodes,
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
      saveDatasets(datasetStore.getAll());
      setDatasetDialogOpen(false);
      setEditingDatasetId(null);
    },
    [editingDatasetId, datasetStore, setDatasetDialogOpen, setEditingDatasetId],
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
      bridge.insertTemplateExpression({
        kind: 'tag-open',
        expr: '',
        tagName,
      });
    },
    [bridge],
  );

  const handleChartSave = useCallback(
    (_chart: DocChart) => {
      bridge.insertChart(_chart);
      setCharts((current) => [...current, _chart]);
    },
    [bridge, setCharts],
  );

  const handleCodeSave = useCallback(
    (_code: DocCode) => {
      bridge.insertCode(_code);
      setCodes((current) => [...current, _code]);
    },
    [bridge, setCodes],
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
