import { useState } from 'react'
import { findTagDefinition } from '@nop-chaos/word-editor-core'

interface ExprInsertDialogProps {
  open: boolean
  onClose: () => void
  onInsert: (expr: string) => void
}

type ExprType = 'el' | 'xpl'

export function ExprInsertDialog({ open, onClose, onInsert }: ExprInsertDialogProps) {
  const [exprType, setExprType] = useState<ExprType>('el')
  const [expression, setExpression] = useState('')
  const [selectedTag, setSelectedTag] = useState('c:if')
  const [tagAttrs, setTagAttrs] = useState<Record<string, string>>({})

  if (!open) return null

  const handleInsert = () => {
    if (exprType === 'el') {
      if (!expression.trim()) return
      onInsert(`\${${expression.trim()}}`)
    } else {
      const tagDef = findTagDefinition(selectedTag, 'tag-open')
      if (!tagDef) return

      const attrs = tagDef.defaultAttrs || {}
      const attrPairs = Object.entries({
        ...attrs,
        ...tagAttrs
      })
        .filter(([, value]) => value.trim())
        .map(([key, value]) => `${key}="${value.trim()}"`)
        .join(' ')

      if (tagDef.kind === 'tag-selfclose') {
        onInsert(`<${selectedTag}${attrPairs ? ' ' + attrPairs : ''} />`)
      } else {
        onInsert(`<${selectedTag}${attrPairs ? ' ' + attrPairs : ''}>${selectedTag}</${selectedTag}>`)
      }
    }
    onClose()
  }

  const availableTags = ['c:if', 'c:for', 'c:forEach', 'c:choose', 'c:when', 'c:otherwise', 'c:set', 'c:out']
  const currentTagDef = findTagDefinition(selectedTag, 'tag-open')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-[480px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold mb-3">Insert Template Expression</h3>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setExprType('el')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              exprType === 'el'
                ? 'bg-[var(--nop-accent)] text-white'
                : 'bg-[var(--nop-surface-soft)] text-[var(--nop-text-strong)] hover:bg-[var(--nop-surface-card)]'
            }`}
          >
            EL Expression
          </button>
          <button
            type="button"
            onClick={() => setExprType('xpl')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              exprType === 'xpl'
                ? 'bg-[var(--nop-accent)] text-white'
                : 'bg-[var(--nop-surface-soft)] text-[var(--nop-text-strong)] hover:bg-[var(--nop-surface-card)]'
            }`}
          >
            XPL Tag
          </button>
        </div>

        {exprType === 'el' ? (
          <div className="mb-4">
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="\${entity.fieldName}"
              className="w-full border border-[var(--nop-border)] rounded-md px-3 py-2 text-sm resize-y min-h-[80px] outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
            />
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--nop-text-strong)] mb-1">
                Tag Name
              </label>
              <select
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value)
                  setTagAttrs({})
                }}
                className="w-full border border-[var(--nop-border)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
              >
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {currentTagDef && currentTagDef.defaultAttrs && (
              <div className="space-y-2">
                {Object.entries(currentTagDef.defaultAttrs).map(([attrName]) => (
                  <div key={attrName}>
                    <label className="block text-xs font-medium text-[var(--nop-text-strong)] mb-1">
                      {attrName}
                    </label>
                    <input
                      type="text"
                      value={tagAttrs[attrName] || ''}
                      onChange={(e) => setTagAttrs(prev => ({ ...prev, [attrName]: e.target.value }))}
                      placeholder={currentTagDef.defaultAttrs?.[attrName] || ''}
                      className="w-full border border-[var(--nop-border)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-[var(--nop-text-strong)] hover:bg-[var(--nop-surface-soft)] rounded-md outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="px-3 py-1.5 text-sm bg-[var(--nop-accent)] text-white rounded-md hover:bg-[var(--nop-accent-strong)] transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
