import { SpreadsheetFindReplacePanel } from './spreadsheet-toolbar/find-replace-panel.js';
import { SpreadsheetToolbarGroups } from './spreadsheet-toolbar/toolbar-groups.js';
import { SpreadsheetToolbarStatus } from './spreadsheet-toolbar/toolbar-status.js';
import type { SpreadsheetToolbarProps } from './spreadsheet-toolbar/types.js';

export type { SpreadsheetToolbarProps, StyleToolType } from './spreadsheet-toolbar/types.js';

export function SpreadsheetToolbar(props: SpreadsheetToolbarProps) {
  return (
    <>
      <div className="rd-toolbar rd-toolbar--single-row" data-slot="spreadsheet-toolbar">
        <SpreadsheetToolbarGroups {...props} />
        <SpreadsheetToolbarStatus
          selectedCell={props.selectedCell}
          cellAddress={props.cellAddress}
          frozen={props.frozen}
        />
      </div>

      <SpreadsheetFindReplacePanel {...props} />
    </>
  );
}
