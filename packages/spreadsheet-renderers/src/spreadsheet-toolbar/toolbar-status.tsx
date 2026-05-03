import { t } from '@nop-chaos/flux-i18n';

export function SpreadsheetToolbarStatus(props: {
  selectedCell: { row: number; col: number } | null;
  cellAddress: string;
  frozen: boolean;
}) {
  return (
    <div className="rd-toolbar-status">
      <span className="rd-toolbar-cell-addr">{props.selectedCell ? props.cellAddress : ''}</span>
      {props.frozen ? (
        <span className="rd-toolbar-frozen-badge">{t('flux.spreadsheet.frozen')}</span>
      ) : null}
    </div>
  );
}
