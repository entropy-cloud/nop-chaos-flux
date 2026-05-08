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
    <div className="cell-editor">
      <Label htmlFor={cellValueInputId}>{props.cellAddress}</Label>
      <Input
        id={cellValueInputId}
        size="sm"
        value={props.cellValue}
        onChange={(e) => props.onCellValueChange(e.target.value)}
        placeholder="Enter cell value"
      />
      {props.showCommentInput ? (
        <div className="comment-editor">
          <Label htmlFor={commentInputId}>{t('flux.spreadsheet.comment')}</Label>
          <Input
            id={commentInputId}
            size="sm"
            value={props.commentText}
            onChange={(e) => props.onCommentTextChange(e.target.value)}
            placeholder="Add comment..."
          />
          <Button variant="ghost" size="xs" onClick={props.onAddComment}>
            {t('flux.spreadsheet.add')}
          </Button>
          {props.hasComment ? (
            <Button variant="ghost" size="xs" onClick={props.onDeleteComment}>
              {t('flux.common.delete')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
