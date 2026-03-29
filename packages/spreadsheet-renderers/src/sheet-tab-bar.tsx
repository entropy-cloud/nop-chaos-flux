import { useCallback, useRef, useState } from 'react';
import type { WorksheetDocument } from '@nop-chaos/spreadsheet-core';

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
    (e: React.MouseEvent, sheetId: string) => {
      e.stopPropagation();
      if (onRemoveSheet) {
        onRemoveSheet(sheetId);
      }
    },
    [onRemoveSheet],
  );

  return (
    <div className="ss-sheet-bar">
      <div className="ss-sheet-bar-tabs">
      {visibleSheets.map((sheet) => {
        const isActive = sheet.id === activeSheetId;
        const isRenaming = renamingSheetId === sheet.id;

        return (
          <button
            key={sheet.id}
            className="ss-sheet-tab"
            data-active={isActive || undefined}
            onClick={() => handleTabClick(sheet.id)}
            onDoubleClick={() => handleTabDoubleClick(sheet.id, sheet.name)}
          >
            {isRenaming ? (
              <input
                ref={renameInputRef}
                className="ss-sheet-tab-rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                autoFocus
              />
            ) : (
              <>
                {sheet.name}
                {sheet.protected && (
                  <span className="ss-sheet-tab-icon" aria-label="Protected">
                    🔒
                  </span>
                )}
                {sheet.tabColor && (
                  <span
                    className="ss-sheet-tab-color"
                    style={{ backgroundColor: sheet.tabColor }}
                  />
                )}
                {onRemoveSheet && canRemoveSheet && (
                  <span
                    className="ss-sheet-tab-close"
                    onClick={(e) => handleCloseClick(e, sheet.id)}
                    aria-label="Remove sheet"
                  >
                    ×
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
      </div>
      <button
        className="ss-sheet-add"
        onClick={onAddSheet}
        aria-label="Add sheet"
      >
        +
      </button>
    </div>
  );
}
