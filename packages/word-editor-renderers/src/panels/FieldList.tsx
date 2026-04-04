import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { Columns, Copy, Info } from 'lucide-react'
import type { DatasetStoreApi } from '@nop-chaos/word-editor-core'
import { Button, ScrollArea } from '@nop-chaos/ui'

interface FieldListProps {
  store: DatasetStoreApi
  onFieldClick?: (datasetName: string, columnName: string) => void
}

export function FieldList({ store, onFieldClick }: FieldListProps) {
  const selectedDataset = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => {
      if (!state.selectedDatasetId) return null
      return state.datasets.find(ds => ds.id === state.selectedDatasetId) || null
    }
  )

  const handleFieldClick = (column: { name: string; label: string }) => {
    if (!selectedDataset || !onFieldClick) return
    onFieldClick(selectedDataset.name, column.name)
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
      sql: 'bg-blue-50 text-blue-600 border-blue-200',
      api: 'bg-green-50 text-green-600 border-green-200',
      mongo: 'bg-purple-50 text-purple-600 border-purple-200',
      static: 'bg-gray-50 text-gray-600 border-gray-200'
    }
    return colors[type] || 'bg-gray-50 text-gray-600 border-gray-200'
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--nop-border)]">
        <h2 className="text-sm font-semibold text-[var(--nop-text-strong)]">Fields</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!selectedDataset ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Columns className="w-8 h-8 text-[var(--nop-body-copy)] opacity-50 mb-2" />
              <p className="text-xs text-[var(--nop-body-copy)] opacity-70">
                No dataset selected
              </p>
              <p className="text-[10px] text-[var(--nop-body-copy)] opacity-50 mt-1">
                Select a dataset to view its fields
              </p>
            </div>
          ) : selectedDataset.columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Info className="w-8 h-8 text-[var(--nop-body-copy)] opacity-50 mb-2" />
              <p className="text-xs text-[var(--nop-body-copy)] opacity-70">
                No fields in dataset
              </p>
              <p className="text-[10px] text-[var(--nop-body-copy)] opacity-50 mt-1">
                Add fields to {selectedDataset.name}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDataset.columns.map((column) => (
                <Button
                  key={column.name}
                  type="button"
                  variant="ghost"
                  onClick={() => handleFieldClick(column)}
                  className="w-full text-left justify-start h-auto p-3 group"
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-[var(--nop-text-strong)] truncate">
                          {column.name}
                        </h3>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getTypeColor(column.type)}`}
                        >
                          {getTypeLabel(column.type)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--nop-body-copy)] truncate">
                        {column.label || column.name}
                      </p>
                      {column.description && (
                        <p className="text-[10px] text-[var(--nop-body-copy)] opacity-70 mt-1 line-clamp-2">
                          {column.description}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFieldClick(column)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                      title="Copy field reference"
                    >
                      <Copy className="w-3.5 h-3.5 text-[var(--nop-body-copy)]" />
                    </Button>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
