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
export declare function SheetTabBar({ sheets, activeSheetId, onSwitchSheet, onAddSheet, onRemoveSheet, onRenameSheet, canRemoveSheet, }: SheetTabBarProps): import("react/jsx-runtime").JSX.Element;
