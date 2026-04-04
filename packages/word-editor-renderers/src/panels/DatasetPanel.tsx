import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { Database, Plus, MoreVertical } from 'lucide-react'
import type { DatasetStoreApi } from '@nop-chaos/word-editor-core'
import { Button, ScrollArea, cn } from '@nop-chaos/ui'

interface DatasetPanelProps {
  store: DatasetStoreApi
  onAddDataset: () => void
  onEditDataset: (datasetId: string) => void
}

export function DatasetPanel({ store, onAddDataset, onEditDataset }: DatasetPanelProps) {
  const datasets = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.datasets
  )

  const selectedDatasetId = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.selectedDatasetId
  )

  const handleDatasetMenu = (datasetId: string, event: React.MouseEvent) => {
    event.stopPropagation()
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      sql: 'SQL',
      api: 'API',
      mongo: 'Mongo',
      static: 'Static'
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      sql: 'bg-blue-100 text-blue-700',
      api: 'bg-green-100 text-green-700',
      mongo: 'bg-purple-100 text-purple-700',
      static: 'bg-gray-100 text-gray-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--nop-border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--nop-text-strong)]">Datasets</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onAddDataset}
            title="Add Dataset"
          >
            <Plus className="w-4 h-4 text-[var(--nop-accent)]" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Database className="w-8 h-8 text-[var(--nop-body-copy)] opacity-50 mb-2" />
              <p className="text-xs text-[var(--nop-body-copy)] opacity-70">
                No datasets found
              </p>
              <p className="text-[10px] text-[var(--nop-body-copy)] opacity-50 mt-1">
                Create a dataset to get started
              </p>
              <Button
                type="button"
                size="xs"
                onClick={onAddDataset}
                className="mt-3"
              >
                Add Dataset
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  onClick={() => onEditDataset(dataset.id)}
                  className={cn(
                    'group rounded-lg border p-3 cursor-pointer transition-all duration-160 outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30',
                    selectedDatasetId === dataset.id
                      ? 'border-[var(--nop-accent)] bg-[var(--nop-surface-soft)]'
                      : 'border-[var(--nop-border)] hover:border-[var(--nop-accent)] hover:bg-[var(--nop-surface-soft)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-[var(--nop-text-strong)] truncate">
                          {dataset.name}
                        </h3>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getTypeColor(dataset.type)}`}
                        >
                          {getTypeLabel(dataset.type)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--nop-body-copy)] line-clamp-2">
                        {dataset.description || 'No description'}
                      </p>
                      {dataset.columns.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--nop-body-copy)]">
                          <Database className="w-3 h-3 opacity-70" />
                          <span>{dataset.columns.length} column{dataset.columns.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => handleDatasetMenu(dataset.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dataset Options"
                    >
                      <MoreVertical className="w-4 h-4 text-[var(--nop-body-copy)]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
