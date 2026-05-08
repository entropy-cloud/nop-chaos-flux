import { useState } from 'react';
import type { DocCode } from '@nop-chaos/word-editor-core';
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
  cn,
} from '@nop-chaos/ui';

const QR_CODE_PATTERN = [
  1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0,
  1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0,
];

interface CodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (code: DocCode) => void;
  initialData?: DocCode | null;
}

export function CodeDialog({ open, onClose, onSave, initialData }: CodeDialogProps) {
  const dialogIdPrefix = initialData ? 'edit-code-dialog' : 'create-code-dialog';
  const [codeName, setCodeName] = useState(() => initialData?.codeName ?? '');
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>(
    () => initialData?.codeType ?? 'barcode',
  );
  const [datasetId, setDatasetId] = useState(() => initialData?.datasetId ?? '');
  const [valueField, setValueField] = useState(() => initialData?.valueField ?? '');

  const handleSave = () => {
    if (!codeName.trim() || !valueField.trim()) {
      return;
    }

    onSave({
      id: initialData?.id ?? `code_${Date.now()}`,
      codeName: codeName.trim(),
      codeType,
      datasetId: datasetId.trim(),
      valueField: valueField.trim(),
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
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Code' : 'Create Code'}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div>
            <Label htmlFor={`${dialogIdPrefix}-name`}>
              {t('flux.wordEditor.codeName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${dialogIdPrefix}-name`}
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              placeholder="Enter code name"
              size="sm"
            />
          </div>

          <div>
            <Label htmlFor={`${dialogIdPrefix}-type`}>{t('flux.wordEditor.codeType')}</Label>
            <NativeSelect
              id={`${dialogIdPrefix}-type`}
              value={codeType}
              onChange={(e) => setCodeType(e.target.value as 'barcode' | 'qrcode')}
              className="w-full"
            >
              <NativeSelectOption value="barcode">
                {t('flux.wordEditor.barcode')}
              </NativeSelectOption>
              <NativeSelectOption value="qrcode">{t('flux.wordEditor.qrcode')}</NativeSelectOption>
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor={`${dialogIdPrefix}-dataset-id`}>{t('flux.wordEditor.datasetId')}</Label>
            <Input
              id={`${dialogIdPrefix}-dataset-id`}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder="Enter dataset ID"
              size="sm"
            />
          </div>

          <div>
            <Label htmlFor={`${dialogIdPrefix}-value-field`}>
              {t('flux.wordEditor.valueField')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${dialogIdPrefix}-value-field`}
              value={valueField}
              onChange={(e) => setValueField(e.target.value)}
              placeholder="Enter value field"
              size="sm"
            />
          </div>

          <div className="border-t pt-4">
            <Label>{t('flux.wordEditor.preview')}</Label>
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
                  {QR_CODE_PATTERN.map((isFilled, index) => {
                    const qrCellKey = `qr-${index}-${isFilled ? '1' : '0'}`;
                    return (
                      <div
                        key={qrCellKey}
                        className={cn('w-full h-full', isFilled ? 'bg-foreground' : 'bg-muted/50')}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="bg-transparent">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('flux.common.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!codeName.trim() || !valueField.trim()}>
            {t('flux.common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
