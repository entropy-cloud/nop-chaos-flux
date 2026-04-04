import { useState } from 'react'
import type { DocCode } from '@nop-chaos/word-editor-core'
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
  cn
} from '@nop-chaos/ui'

const QR_CODE_PATTERN = [
  1,0,1,1,0,1,0,
  0,1,0,1,1,0,1,
  1,1,0,0,1,1,0,
  0,1,1,0,1,0,1,
  1,0,1,1,0,1,0,
  0,1,0,1,1,0,1,
  1,0,1,0,1,1,0
]

interface CodeDialogProps {
  open: boolean
  onClose: () => void
  onSave: (code: DocCode) => void
  initialData?: DocCode | null
}

export function CodeDialog({ open, onClose, onSave, initialData }: CodeDialogProps) {
  const [codeName, setCodeName] = useState(() => initialData?.codeName ?? '')
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>(() => initialData?.codeType ?? 'barcode')
  const [datasetId, setDatasetId] = useState(() => initialData?.datasetId ?? '')
  const [valueField, setValueField] = useState(() => initialData?.valueField ?? '')

  const handleSave = () => {
    if (!codeName.trim() || !valueField.trim()) {
      return
    }

    onSave({
      id: initialData?.id ?? `code_${Date.now()}`,
      codeName: codeName.trim(),
      codeType,
      datasetId: datasetId.trim(),
      valueField: valueField.trim()
    })
    onClose()
  }

  const isEditMode = !!initialData

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Code' : 'Create Code'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>
              Code Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              placeholder="Enter code name"
              size="sm"
            />
          </div>

          <div>
            <Label>Code Type</Label>
            <NativeSelect
              value={codeType}
              onChange={(e) => setCodeType(e.target.value as 'barcode' | 'qrcode')}
              className="w-full"
            >
              <NativeSelectOption value="barcode">Barcode</NativeSelectOption>
              <NativeSelectOption value="qrcode">QR Code</NativeSelectOption>
            </NativeSelect>
          </div>

          <div>
            <Label>Dataset ID</Label>
            <Input
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder="Enter dataset ID"
              size="sm"
            />
          </div>

          <div>
            <Label>
              Value Field <span className="text-destructive">*</span>
            </Label>
            <Input
              value={valueField}
              onChange={(e) => setValueField(e.target.value)}
              placeholder="Enter value field"
              size="sm"
            />
          </div>

          <div className="border-t pt-4">
            <Label>Preview</Label>
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/20">
              {codeType === 'barcode' ? (
                <div className="flex items-center gap-[2px] h-16">
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-0.5 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-0.5 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-0.5 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-0.5 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-muted"></div>
                  <div className="w-0.5 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-0.5 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-0.5 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-muted"></div>
                  <div className="w-0.5 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-muted"></div>
                  <div className="w-0.5 h-full bg-foreground"></div>
                  <div className="w-1 h-full bg-muted"></div>
                  <div className="w-1 h-full bg-foreground"></div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-0.5 w-24 h-24">
                  {QR_CODE_PATTERN.map((isFilled, i) => (
                    <div
                      key={i}
                      className={cn('w-full h-full', isFilled ? 'bg-foreground' : 'bg-muted/50')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!codeName.trim() || !valueField.trim()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
