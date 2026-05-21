import { useRef, useState } from 'react';
import type { WorksheetDocument } from '@nop-chaos/spreadsheet-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Input,
} from '@nop-chaos/ui';

export interface SheetTabBarProps {
  sheets: WorksheetDocument[];
  activeSheetId: string;
  onSwitchSheet: (sheetId: string) => void;
  onAddSheet: () => void;
  onRemoveSheet?: (sheetId: string) => void;
  onRenameSheet?: (sheetId: string, name: string) => void;
  canRemoveSheet?: boolean;
  readOnly?: boolean;
}

export function SheetTabBar({
  sheets,
  activeSheetId,
  onSwitchSheet,
  onAddSheet,
  onRemoveSheet,
  onRenameSheet,
  canRemoveSheet,
  readOnly,
}: SheetTabBarProps) {
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingSheetId, setPendingSheetId] = useState<string | null>(null);
  const [pendingSheetName, setPendingSheetName] = useState('');

  const visibleSheets = sheets.filter((s) => !s.hidden);

  const handleTabClick = (sheetId: string) => {
      if (readOnly) return;
      if (renamingSheetId === sheetId) return;
      onSwitchSheet(sheetId);
    };

  const handleTabDoubleClick = (sheetId: string, currentName: string) => {
      if (readOnly) return;
      if (!onRenameSheet) return;
      setRenamingSheetId(sheetId);
      setRenameValue(currentName);
    };

  const handleRenameSubmit = () => {
    if (renamingSheetId && onRenameSheet && renameValue.trim()) {
      onRenameSheet(renamingSheetId, renameValue.trim());
    }
    setRenamingSheetId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRenameSubmit();
      } else if (e.key === 'Escape') {
        setRenamingSheetId(null);
        setRenameValue('');
      }
    };

  const handleCloseClick = (e: React.MouseEvent, sheetId: string, sheetName: string) => {
      if (readOnly) return;
      e.stopPropagation();
      if (onRemoveSheet) {
        setPendingSheetId(sheetId);
        setPendingSheetName(sheetName);
        setDeleteConfirmOpen(true);
      }
    };

  const handleConfirmDelete = () => {
    if (pendingSheetId && onRemoveSheet) {
      onRemoveSheet(pendingSheetId);
    }
    setDeleteConfirmOpen(false);
    setPendingSheetId(null);
    setPendingSheetName('');
  };

  return (
    <>
      <div className="ss-sheet-bar">
        <div className="ss-sheet-bar-tabs">
          {visibleSheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isRenaming = renamingSheetId === sheet.id;

            return (
              <div key={sheet.id} className="ss-sheet-tab-item" data-active={isActive || undefined}>
                {isRenaming ? (
                  <Input
                    ref={renameInputRef}
                    className="ss-sheet-tab-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleRenameKeyDown}
                    readOnly={readOnly}
                    disabled={readOnly}
                    size="sm"
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="ss-sheet-tab"
                    data-active={isActive || undefined}
                    onClick={() => handleTabClick(sheet.id)}
                    onDoubleClick={() => handleTabDoubleClick(sheet.id, sheet.name)}
                    disabled={readOnly}
                  >
                    {sheet.name}
                    {sheet.tabColor && (
                      <span
                        className="ss-sheet-tab-color"
                        style={{ backgroundColor: sheet.tabColor }}
                      />
                    )}
                  </Button>
                )}
                {onRemoveSheet && canRemoveSheet && !isRenaming ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                     className="ss-sheet-tab-close"
                     onClick={(e) => handleCloseClick(e, sheet.id, sheet.name)}
                     aria-label={t('flux.sheet.removeSheetAriaLabel', { name: sheet.name })}
                     title={t('flux.sheet.removeSheetAriaLabel', { name: sheet.name })}
                     disabled={readOnly}
                   >
                    ×
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ss-sheet-add"
          onClick={onAddSheet}
          aria-label={t('flux.sheet.addSheetAriaLabel')}
          disabled={readOnly}
        >
          +
        </Button>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('flux.sheet.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              {t('flux.sheet.deleteDescription', { name: pendingSheetName || 'this sheet' })}
            </DialogDescription>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t('flux.common.cancel')}
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('flux.common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
