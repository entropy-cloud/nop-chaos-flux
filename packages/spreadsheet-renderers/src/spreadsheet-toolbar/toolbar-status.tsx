import { t } from '@nop-chaos/flux-i18n';

export function SpreadsheetToolbarStatus(props: {
  selectedCell: { row: number; col: number } | null;
  cellAddress: string;
  frozen: boolean;
}) {
  return (
    <div data-slot="spreadsheet-toolbar-status">
      <span data-slot="spreadsheet-toolbar-cell-address">
        {props.selectedCell ? props.cellAddress : ''}
      </span>
      {props.frozen ? (
        <span data-slot="spreadsheet-toolbar-frozen-badge">
          {t('flux.spreadsheet.frozen')}
        </span>
      ) : null}
    </div>
  );
}
