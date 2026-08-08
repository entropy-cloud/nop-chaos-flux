import { useState } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { Database, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { DatasetStoreApi } from '@nop-chaos/word-editor-core';
import type { Dataset } from '@nop-chaos/word-editor-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ScrollArea,
  cn,
} from '@nop-chaos/ui';

interface DatasetPanelProps {
  store: DatasetStoreApi;
  onAddDataset: () => void;
  onEditDataset: (datasetId: string) => void;
  onDeleteDataset?: (datasetId: string) => void;
  showHeader?: boolean;
}

export function DatasetPanel({
  store,
  onAddDataset,
  onEditDataset,
  onDeleteDataset,
  showHeader = true,
}: DatasetPanelProps) {
  const datasets = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.datasets,
  );

  const selectedDatasetId = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.selectedDatasetId,
  );

  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);

  const handleRowClick = (datasetId: string) => {
    store.select(datasetId);
    onEditDataset(datasetId);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDeleteDataset?.(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      sql: 'SQL',
      api: 'API',
      mongo: 'Mongo',
      static: 'Static',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      sql: 'bg-primary/10 text-primary',
      api: 'bg-emerald-500/10 text-emerald-700',
      mongo: 'bg-violet-500/10 text-violet-700',
      static: 'bg-muted text-muted-foreground',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="h-full flex flex-col">
      {showHeader ? (
        <div className="px-4 py-3 border-b border-[var(--nop-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--nop-text-strong)]">
              {t('flux.wordEditor.datasets')}
            </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onAddDataset}
                title={t('flux.wordEditor.addDataset')}
                aria-label={t('flux.wordEditor.addDataset')}
              >
              <Plus className="w-4 h-4 text-[var(--nop-accent)]" />
            </Button>
          </div>
        </div>
      ) : null}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Database className="w-8 h-8 text-[var(--nop-body-copy)] opacity-50 mb-2" />
              <p className="text-xs text-[var(--nop-body-copy)] opacity-70">
                {t('flux.wordEditor.noDatasets')}
              </p>
              <p className="text-[10px] text-[var(--nop-body-copy)] opacity-50 mt-1">
                {t('flux.wordEditor.createDatasetHint')}
              </p>
              <Button type="button" size="xs" onClick={onAddDataset} className="mt-3">
                {t('flux.wordEditor.addDataset')}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className={cn(
                    'group rounded-lg border p-3 transition-all duration-160',
                    selectedDatasetId === dataset.id
                      ? 'border-[var(--nop-accent)] bg-[var(--nop-surface-soft)]'
                      : 'border-[var(--nop-border)] hover:border-[var(--nop-accent)] hover:bg-[var(--nop-surface-soft)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRowClick(dataset.id)}
                      className="h-auto min-w-0 flex-1 justify-start p-0 text-left hover:bg-transparent focus-visible:ring-[var(--nop-accent)]"
                    >
                      <span className="flex min-w-0 flex-1 flex-col items-start">
                        <span className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--nop-text-strong)] truncate">
                            {dataset.name}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] font-medium rounded',
                              getTypeColor(dataset.type),
                            )}
                          >
                            {getTypeLabel(dataset.type)}
                          </span>
                        </span>
                        <span className="text-[11px] text-[var(--nop-body-copy)] line-clamp-2">
                          {dataset.description || t('flux.wordEditor.noDescription')}
                        </span>
                        {dataset.columns.length > 0 && (
                          <span className="mt-2 flex items-center gap-1 text-[10px] text-[var(--nop-body-copy)]">
                            <Database className="w-3 h-3 opacity-70" />
                            <span>
                              {dataset.columns.length} column{dataset.columns.length !== 1 ? 's' : ''}
                            </span>
                          </span>
                        )}
                      </span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t('flux.wordEditor.datasetOptions')}
                            aria-label={t('flux.wordEditor.datasetOptions')}
                            data-testid={`dataset-menu-${dataset.id}`}
                          >
                            <MoreVertical className="w-4 h-4 text-[var(--nop-body-copy)]" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditDataset(dataset.id)}>
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{t('flux.common.edit')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(dataset)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('flux.wordEditor.deleteDataset')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('flux.wordEditor.deleteDataset')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-foreground">
              {t('flux.wordEditor.deleteDatasetConfirm', { name: deleteTarget?.name ?? '' })}
            </p>
          </DialogBody>
          <DialogFooter className="bg-transparent">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              {t('flux.common.cancel')}
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              {t('flux.wordEditor.deleteDataset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
