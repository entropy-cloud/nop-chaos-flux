import { t } from '@nop-chaos/flux-i18n';

export function SpreadsheetToolbarStatus(props: {
  selectedCell: { row: number; col: number } | null;
  cellAddress: string;
  frozen: boolean;
}) {
  return (
    <div className="rd-toolbar-status" data-slot="spreadsheet-toolbar-status">
      <span className="rd-toolbar-cell-addr" data-slot="spreadsheet-toolbar-cell-address">
        {props.selectedCell ? props.cellAddress : ''}
      </span>
      {props.frozen ? (
        <span className="rd-toolbar-frozen-badge" data-slot="spreadsheet-toolbar-frozen-badge">
          {t('flux.spreadsheet.frozen')}
        </span>
      ) : null}
    </div>
  );
}
