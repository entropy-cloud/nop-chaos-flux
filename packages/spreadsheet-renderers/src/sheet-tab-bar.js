import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, } from '@nop-chaos/ui';
import { Button } from '@nop-chaos/ui';
export function SheetTabBar({ sheets, activeSheetId, onSwitchSheet, onAddSheet, onRemoveSheet, onRenameSheet, canRemoveSheet, }) {
    const [renamingSheetId, setRenamingSheetId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pendingSheetId, setPendingSheetId] = useState(null);
    const [pendingSheetName, setPendingSheetName] = useState('');
    const visibleSheets = sheets.filter((s) => !s.hidden);
    const handleTabClick = useCallback((sheetId) => {
        if (renamingSheetId === sheetId)
            return;
        onSwitchSheet(sheetId);
    }, [onSwitchSheet, renamingSheetId]);
    const handleTabDoubleClick = useCallback((sheetId, currentName) => {
        if (!onRenameSheet)
            return;
        setRenamingSheetId(sheetId);
        setRenameValue(currentName);
    }, [onRenameSheet]);
    const handleRenameSubmit = useCallback(() => {
        if (renamingSheetId && onRenameSheet && renameValue.trim()) {
            onRenameSheet(renamingSheetId, renameValue.trim());
        }
        setRenamingSheetId(null);
        setRenameValue('');
    }, [renamingSheetId, renameValue, onRenameSheet]);
    const handleRenameKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRenameSubmit();
        }
        else if (e.key === 'Escape') {
            setRenamingSheetId(null);
            setRenameValue('');
        }
    }, [handleRenameSubmit]);
    const handleCloseClick = useCallback((e, sheetId, sheetName) => {
        e.stopPropagation();
        if (onRemoveSheet) {
            setPendingSheetId(sheetId);
            setPendingSheetName(sheetName);
            setDeleteConfirmOpen(true);
        }
    }, [onRemoveSheet]);
    const handleConfirmDelete = useCallback(() => {
        if (pendingSheetId && onRemoveSheet) {
            onRemoveSheet(pendingSheetId);
        }
        setDeleteConfirmOpen(false);
        setPendingSheetId(null);
        setPendingSheetName('');
    }, [pendingSheetId, onRemoveSheet]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ss-sheet-bar", children: [_jsx("div", { className: "ss-sheet-bar-tabs", children: visibleSheets.map((sheet) => {
                            const isActive = sheet.id === activeSheetId;
                            const isRenaming = renamingSheetId === sheet.id;
                            return (_jsx("button", { className: "ss-sheet-tab", "data-active": isActive || undefined, onClick: () => handleTabClick(sheet.id), onDoubleClick: () => handleTabDoubleClick(sheet.id, sheet.name), children: isRenaming ? (_jsx("input", { ref: renameInputRef, className: "ss-sheet-tab-rename", value: renameValue, onChange: (e) => setRenameValue(e.target.value), onBlur: handleRenameSubmit, onKeyDown: handleRenameKeyDown, autoFocus: true })) : (_jsxs(_Fragment, { children: [sheet.name, sheet.tabColor && (_jsx("span", { className: "ss-sheet-tab-color", style: { backgroundColor: sheet.tabColor } })), onRemoveSheet && canRemoveSheet && (_jsx("span", { className: "ss-sheet-tab-close", onClick: (e) => handleCloseClick(e, sheet.id, sheet.name), "aria-label": "Remove sheet", children: "\u00D7" }))] })) }, sheet.id));
                        }) }), _jsx("button", { className: "ss-sheet-add", onClick: onAddSheet, "aria-label": "Add sheet", children: "+" })] }), _jsx(Dialog, { open: deleteConfirmOpen, onOpenChange: setDeleteConfirmOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Delete Sheet" }), _jsxs(DialogDescription, { children: ["Are you sure you want to delete \"", pendingSheetName || 'this sheet', "\"? This action cannot be undone."] })] }), _jsxs(DialogFooter, { children: [_jsx(DialogClose, { render: _jsx(Button, { variant: "outline" }), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleConfirmDelete, children: "Delete" })] })] }) })] }));
}
//# sourceMappingURL=sheet-tab-bar.js.map