import { useCallback, useRef, useState } from 'react';
import type { WorksheetDocument } from '@nop-chaos/spreadsheet-core';
import {
  Button,
  Dialog,
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
}

export function SheetTabBar({
  sheets,
  activeSheetId,
  onSwitchSheet,
  onAddSheet,
  onRemoveSheet,
  onRenameSheet,
  canRemoveSheet,
}: SheetTabBarProps) {
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingSheetId, setPendingSheetId] = useState<string | null>(null);
  const [pendingSheetName, setPendingSheetName] = useState('');

  const visibleSheets = sheets.filter((s) => !s.hidden);

  const handleTabClick = useCallback(
    (sheetId: string) => {
      if (renamingSheetId === sheetId) return;
      onSwitchSheet(sheetId);
    },
    [onSwitchSheet, renamingSheetId],
  );

  const handleTabDoubleClick = useCallback(
    (sheetId: string, currentName: string) => {
      if (!onRenameSheet) return;
      setRenamingSheetId(sheetId);
      setRenameValue(currentName);
    },
    [onRenameSheet],
  );

  const handleRenameSubmit = useCallback(() => {
    if (renamingSheetId && onRenameSheet && renameValue.trim()) {
      onRenameSheet(renamingSheetId, renameValue.trim());
    }
    setRenamingSheetId(null);
    setRenameValue('');
  }, [renamingSheetId, renameValue, onRenameSheet]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRenameSubmit();
      } else if (e.key === 'Escape') {
        setRenamingSheetId(null);
        setRenameValue('');
      }
    },
    [handleRenameSubmit],
  );

  const handleCloseClick = useCallback(
    (e: React.MouseEvent, sheetId: string, sheetName: string) => {
      e.stopPropagation();
      if (onRemoveSheet) {
        setPendingSheetId(sheetId);
        setPendingSheetName(sheetName);
        setDeleteConfirmOpen(true);
      }
    },
    [onRemoveSheet],
  );

  const handleConfirmDelete = useCallback(() => {
    if (pendingSheetId && onRemoveSheet) {
      onRemoveSheet(pendingSheetId);
    }
    setDeleteConfirmOpen(false);
    setPendingSheetId(null);
    setPendingSheetName('');
  }, [pendingSheetId, onRemoveSheet]);

  return (
    <>
      <div className="ss-sheet-bar">
        <div className="ss-sheet-bar-tabs">
          {visibleSheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          const isRenaming = renamingSheetId === sheet.id;

          return (
            <Button
              key={sheet.id}
              variant="ghost"
              size="xs"
              className="ss-sheet-tab"
              data-active={isActive || undefined}
              onClick={() => handleTabClick(sheet.id)}
              onDoubleClick={() => handleTabDoubleClick(sheet.id, sheet.name)}
            >
              {isRenaming ? (
                <Input
                  ref={renameInputRef}
                  className="ss-sheet-tab-rename"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleRenameKeyDown}
                  autoFocus
                  size="sm"
                />
              ) : (
                <>
                  {sheet.name}
                  {sheet.tabColor && (
                    <span
                      className="ss-sheet-tab-color"
                      style={{ backgroundColor: sheet.tabColor }}
                    />
                  )}
                  {onRemoveSheet && canRemoveSheet && (
                    <span
                      className="ss-sheet-tab-close"
                      onClick={(e) => handleCloseClick(e, sheet.id, sheet.name)}
                      aria-label="Remove sheet"
                    >
                      ×
                    </span>
                  )}
                </>
              )}
            </Button>
          );
        })}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ss-sheet-add"
          onClick={onAddSheet}
          aria-label="Add sheet"
        >
          +
        </Button>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sheet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{pendingSheetName || 'this sheet'}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
