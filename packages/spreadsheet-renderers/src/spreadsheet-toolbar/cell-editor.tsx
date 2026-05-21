import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, Label } from '@nop-chaos/ui';
import type { SpreadsheetToolbarProps } from './types.js';

export function SpreadsheetCellEditor(props: SpreadsheetToolbarProps) {
  if (!props.selectedCell) {
    return null;
  }

  const cellValueInputId = `spreadsheet-cell-value-${props.cellAddress}`;
  const commentInputId = `spreadsheet-cell-comment-${props.cellAddress}`;

  return (
    <div className="cell-editor" data-slot="spreadsheet-cell-editor">
      <Label htmlFor={cellValueInputId}>{props.cellAddress}</Label>
      <Input
        id={cellValueInputId}
        data-slot="spreadsheet-cell-value-input"
        size="sm"
        value={props.cellValue}
        onChange={(e) => props.onCellValueChange(e.target.value)}
        placeholder={t('flux.spreadsheet.cellValuePlaceholder')}
        readOnly={props.readOnly}
        disabled={props.readOnly}
      />
      {props.showCommentInput ? (
        <div className="comment-editor" data-slot="spreadsheet-comment-editor">
          <Label htmlFor={commentInputId}>{t('flux.spreadsheet.comment')}</Label>
          <Input
            id={commentInputId}
            data-slot="spreadsheet-comment-input"
            size="sm"
            value={props.commentText}
            onChange={(e) => props.onCommentTextChange(e.target.value)}
            placeholder={t('flux.spreadsheet.commentPlaceholder')}
            readOnly={props.readOnly}
            disabled={props.readOnly}
          />
          <Button variant="ghost" size="xs" onClick={props.onAddComment} disabled={props.readOnly}>
            {t('flux.spreadsheet.add')}
          </Button>
          {props.hasComment ? (
            <Button variant="ghost" size="xs" onClick={props.onDeleteComment} disabled={props.readOnly}>
              {t('flux.common.delete')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
