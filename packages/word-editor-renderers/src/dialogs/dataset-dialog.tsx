import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DatasetSourceType, DataColumnInput } from '@nop-chaos/word-editor-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  ScrollArea,
  Textarea,
} from '@nop-chaos/ui';

interface DatasetDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    type: DatasetSourceType;
    columns: DataColumnInput[];
  }) => void;
  initialData?: {
    name: string;
    description: string;
    type: DatasetSourceType;
    columns: DataColumnInput[];
  } | null;
}

export function DatasetDialog({ open, onClose, onSave, initialData }: DatasetDialogProps) {
  const nextColumnKeyRef = useRef(initialData?.columns?.length ?? 0);
  const [name, setName] = useState(() => initialData?.name ?? '');
  const [description, setDescription] = useState(() => initialData?.description ?? '');
  const [type, setType] = useState<DatasetSourceType>(() => initialData?.type ?? 'static');
  const [columns, setColumns] = useState<DataColumnInput[]>(() => initialData?.columns ?? []);
  const [columnKeys, setColumnKeys] = useState<string[]>(() =>
    (initialData?.columns ?? []).map((_, index) => `column-${index}`),
  );

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', label: '', type: 'static' }]);
    const nextKey = `column-${nextColumnKeyRef.current++}`;
    setColumnKeys((current) => [...current, nextKey]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
    setColumnKeys((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleColumnChange = (index: number, field: keyof DataColumnInput, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setColumns(newColumns);
  };

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    const validColumns = columns.filter((col) => col.name?.trim());
    if (validColumns.length !== columns.length) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      type,
      columns: columns.map((col) => ({
        name: col.name?.trim() || '',
        label: col.label?.trim() || '',
        description: col.description?.trim(),
        type: (col.type as DatasetSourceType) || 'static',
      })),
    });
    onClose();
  };

  const isEditMode = !!initialData;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent size="lg" className="flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Dataset' : 'Create Dataset'}</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-1 space-y-4">
              <div>
                <Label>
                  {t('flux.wordEditor.name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter dataset name"
                  size="sm"
                />
              </div>

              <div>
                <Label>{t('flux.wordEditor.description')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                  placeholder="Enter dataset description"
                />
              </div>

              <div>
                <Label>{t('flux.wordEditor.type')}</Label>
                <NativeSelect
                  value={type}
                  onChange={(e) => setType(e.target.value as DatasetSourceType)}
                  className="w-full"
                >
                  <NativeSelectOption value="sql">SQL</NativeSelectOption>
                  <NativeSelectOption value="api">API</NativeSelectOption>
                  <NativeSelectOption value="mongo">
                    {t('flux.wordEditor.mongo')}
                  </NativeSelectOption>
                  <NativeSelectOption value="static">
                    {t('flux.wordEditor.static')}
                  </NativeSelectOption>
                </NativeSelect>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{t('flux.wordEditor.columns')}</Label>
                  <Button type="button" size="xs" onClick={handleAddColumn}>
                    <Plus className="w-3 h-3" />
                    {t('flux.wordEditor.addColumn')}
                  </Button>
                </div>

                {columns.length === 0 ? (
                  <div className="text-center py-6 px-4 border border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {t('flux.wordEditor.noColumnsHint')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {columns.map((column, index) => {
                      const columnKey = columnKeys[index];

                      return (
                        <div
                          key={columnKey}
                          className="flex items-start gap-2 p-3 border rounded-lg"
                        >
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px]">
                                {t('flux.wordEditor.name')}{' '}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                value={column.name || ''}
                                onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                                placeholder="Column name"
                                size="sm"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">{t('flux.wordEditor.label')}</Label>
                              <Input
                                value={column.label || ''}
                                onChange={(e) => handleColumnChange(index, 'label', e.target.value)}
                                placeholder="Column label"
                                size="sm"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">{t('flux.wordEditor.type')}</Label>
                              <NativeSelect
                                value={column.type || 'static'}
                                onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                                size="xs"
                                className="w-full"
                              >
                                <NativeSelectOption value="sql">SQL</NativeSelectOption>
                                <NativeSelectOption value="api">API</NativeSelectOption>
                                <NativeSelectOption value="mongo">
                                  {t('flux.wordEditor.mongo')}
                                </NativeSelectOption>
                                <NativeSelectOption value="static">
                                  {t('flux.wordEditor.static')}
                                </NativeSelectOption>
                              </NativeSelect>
                            </div>
                            <div>
                              <Label className="text-[10px]">
                                {t('flux.wordEditor.description')}
                              </Label>
                              <Input
                                value={column.description || ''}
                                onChange={(e) =>
                                  handleColumnChange(index, 'description', e.target.value)
                                }
                                placeholder="Column description"
                                size="sm"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemoveColumn(index)}
                            title="Remove column"
                            className="mt-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogBody>

        <DialogFooter className="bg-transparent">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('flux.common.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
            {t('flux.common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
