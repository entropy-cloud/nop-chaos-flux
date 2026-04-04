import { useState } from 'react'
import { findTagDefinition } from '@nop-chaos/word-editor-core'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  NativeSelectOption,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea
} from '@nop-chaos/ui'

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
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>Insert Template Expression</DialogTitle>
        </DialogHeader>

        <Tabs data-orientation="horizontal" className="flex-col gap-0">
          <TabsList className="mb-4">
            <TabsTrigger
              value="el"
              data-state={exprType === 'el' ? 'active' : 'inactive'}
              onClick={() => setExprType('el')}
            >
              EL Expression
            </TabsTrigger>
            <TabsTrigger
              value="xpl"
              data-state={exprType === 'xpl' ? 'active' : 'inactive'}
              onClick={() => setExprType('xpl')}
            >
              XPL Tag
            </TabsTrigger>
          </TabsList>

          <TabsContent value={exprType} className="mb-4">
            {exprType === 'el' ? (
              <Textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="${entity.fieldName}"
                className="min-h-[80px]"
              />
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Tag Name</label>
                  <NativeSelect
                    value={selectedTag}
                    onChange={(e) => {
                      setSelectedTag(e.target.value)
                      setTagAttrs({})
                    }}
                    className="w-full"
                  >
                    {availableTags.map((tag) => (
                      <NativeSelectOption key={tag} value={tag}>
                        {tag}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                {currentTagDef && currentTagDef.defaultAttrs && (
                  <div className="space-y-2">
                    {Object.entries(currentTagDef.defaultAttrs).map(([attrName]) => (
                      <div key={attrName}>
                        <label className="block text-xs font-medium mb-1">{attrName}</label>
                        <Input
                          value={tagAttrs[attrName] || ''}
                          onChange={(e) => setTagAttrs(prev => ({ ...prev, [attrName]: e.target.value }))}
                          placeholder={currentTagDef.defaultAttrs?.[attrName] || ''}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleInsert}>Insert</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
