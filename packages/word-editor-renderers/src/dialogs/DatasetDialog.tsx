import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { DataSetSourceType, DataColumnInput } from '@nop-chaos/word-editor-core'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  ScrollArea,
  Textarea
} from '@nop-chaos/ui'

interface DatasetDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string; type: DataSetSourceType; columns: DataColumnInput[] }) => void
  initialData?: { name: string; description: string; type: DataSetSourceType; columns: DataColumnInput[] } | null
}

export function DatasetDialog({ open, onClose, onSave, initialData }: DatasetDialogProps) {
  const [name, setName] = useState(() => initialData?.name ?? '')
  const [description, setDescription] = useState(() => initialData?.description ?? '')
  const [type, setType] = useState<DataSetSourceType>(() => initialData?.type ?? 'static')
  const [columns, setColumns] = useState<DataColumnInput[]>(() => initialData?.columns ?? [])

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', label: '', type: 'static' }])
  }

  const handleRemoveColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index))
  }

  const handleColumnChange = (index: number, field: keyof DataColumnInput, value: string) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setColumns(newColumns)
  }

  const handleSave = () => {
    if (!name.trim()) {
      return
    }

    const validColumns = columns.filter(col => col.name?.trim())
    if (validColumns.length !== columns.length) {
      return
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      type,
      columns: columns.map(col => ({
        name: col.name?.trim() || '',
        label: col.label?.trim() || '',
        description: col.description?.trim(),
        type: (col.type as DataSetSourceType) || 'static'
      }))
    })
    onClose()
  }

  const isEditMode = !!initialData

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent size="lg" className="flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Dataset' : 'Create Dataset'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-1 space-y-4">
              <div>
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter dataset name"
                  size="sm"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                  placeholder="Enter dataset description"
                />
              </div>

              <div>
                <Label>Type</Label>
                <NativeSelect
                  value={type}
                  onChange={(e) => setType(e.target.value as DataSetSourceType)}
                  className="w-full"
                >
                  <NativeSelectOption value="sql">SQL</NativeSelectOption>
                  <NativeSelectOption value="api">API</NativeSelectOption>
                  <NativeSelectOption value="mongo">Mongo</NativeSelectOption>
                  <NativeSelectOption value="static">Static</NativeSelectOption>
                </NativeSelect>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Columns</Label>
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddColumn}
                  >
                    <Plus className="w-3 h-3" />
                    Add Column
                  </Button>
                </div>

                {columns.length === 0 ? (
                  <div className="text-center py-6 px-4 border border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      No columns. Click 'Add Column' to add one.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {columns.map((column, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">
                              Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              value={column.name || ''}
                              onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                              placeholder="Column name"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Label</Label>
                            <Input
                              value={column.label || ''}
                              onChange={(e) => handleColumnChange(index, 'label', e.target.value)}
                              placeholder="Column label"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Type</Label>
                            <NativeSelect
                              value={column.type || 'static'}
                              onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                              size="xs"
                              className="w-full"
                            >
                              <NativeSelectOption value="sql">SQL</NativeSelectOption>
                              <NativeSelectOption value="api">API</NativeSelectOption>
                              <NativeSelectOption value="mongo">Mongo</NativeSelectOption>
                              <NativeSelectOption value="static">Static</NativeSelectOption>
                            </NativeSelect>
                          </div>
                          <div>
                            <Label className="text-[10px]">Description</Label>
                            <Input
                              value={column.description || ''}
                              onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
