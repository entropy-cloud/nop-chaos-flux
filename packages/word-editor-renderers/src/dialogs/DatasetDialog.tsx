import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { DataSetSourceType, DataColumnInput } from '@nop-chaos/word-editor-core'
import { ScrollArea } from '@nop-chaos/ui'

interface DatasetDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string; type: DataSetSourceType; columns: DataColumnInput[] }) => void
  initialData?: { name: string; description: string; type: DataSetSourceType; columns: DataColumnInput[] } | null
}

export function DatasetDialog({ open, onClose, onSave, initialData }: DatasetDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<DataSetSourceType>('static')
  const [columns, setColumns] = useState<DataColumnInput[]>([])

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setDescription(initialData.description)
      setType(initialData.type)
      setColumns(initialData.columns)
    } else {
      setName('')
      setDescription('')
      setType('static')
      setColumns([])
    }
  }, [initialData, open])

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

  if (!open) return null

  const isEditMode = !!initialData

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--nop-border)]">
          <h3 className="text-sm font-semibold text-[var(--nop-text-strong)]">
            {isEditMode ? 'Edit Dataset' : 'Create Dataset'}
          </h3>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--nop-text-strong)] mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm border-[var(--nop-border)] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                  placeholder="Enter dataset name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--nop-text-strong)] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border rounded px-2 py-1 text-sm border-[var(--nop-border)] resize-none outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                  placeholder="Enter dataset description"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--nop-text-strong)] mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DataSetSourceType)}
                  className="w-full border rounded px-2 py-1 text-sm border-[var(--nop-border)] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                >
                  <option value="sql">SQL</option>
                  <option value="api">API</option>
                  <option value="mongo">Mongo</option>
                  <option value="static">Static</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-[var(--nop-text-strong)]">
                    Columns
                  </label>
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--nop-accent)] text-white rounded hover:bg-[var(--nop-accent-strong)] transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                    Add Column
                  </button>
                </div>

                {columns.length === 0 ? (
                  <div className="text-center py-6 px-4 border border-dashed border-[var(--nop-border)] rounded-lg">
                    <p className="text-xs text-[var(--nop-body-copy)]">
                      No columns. Click 'Add Column' to add one.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {columns.map((column, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border border-[var(--nop-border)] rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-[var(--nop-text-strong)] mb-1">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={column.name || ''}
                              onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs border-[var(--nop-border)] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                              placeholder="Column name"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-[var(--nop-text-strong)] mb-1">
                              Label
                            </label>
                            <input
                              type="text"
                              value={column.label || ''}
                              onChange={(e) => handleColumnChange(index, 'label', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs border-[var(--nop-border)] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                              placeholder="Column label"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-[var(--nop-text-strong)] mb-1">
                              Type
                            </label>
                            <select
                              value={column.type || 'static'}
                              onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs border-[var(--nop-border)] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                            >
                              <option value="sql">SQL</option>
                              <option value="api">API</option>
                              <option value="mongo">Mongo</option>
                              <option value="static">Static</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-[var(--nop-text-strong)] mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={column.description || ''}
                              onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs border-[var(--nop-border)] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                              placeholder="Column description"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(index)}
                          className="mt-5 p-1 rounded hover:bg-red-50 transition-colors outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-30"
                          title="Remove column"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <div className="px-6 py-4 border-t border-[var(--nop-border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-[var(--nop-text-strong)] hover:bg-[var(--nop-surface-soft)] rounded-md transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-[var(--nop-accent)] text-white rounded-md hover:bg-[var(--nop-accent-strong)] transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--nop-accent)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
