import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, Label } from '@nop-chaos/ui';
import type { SpreadsheetToolbarProps } from './types.js';

export function SpreadsheetFindReplacePanel(props: SpreadsheetToolbarProps) {
  if (!props.showFindReplace) {
    return null;
  }

  const findInputId = 'spreadsheet-find-query';
  const replaceInputId = 'spreadsheet-replace-text';

  return (
    <div className="find-replace-panel" data-slot="spreadsheet-find-replace-panel">
      <div className="find-row" data-slot="spreadsheet-find-row">
        <Label htmlFor={findInputId}>{t('flux.spreadsheet.find')}</Label>
        <Input
          id={findInputId}
          data-slot="spreadsheet-find-input"
          size="sm"
          value={props.findQuery}
          onChange={(e) => props.onFindQueryChange(e.target.value)}
          placeholder="Search text..."
          autoFocus
        />
        <Button variant="ghost" size="xs" onClick={props.onFind}>
          {t('flux.spreadsheet.findNext')}
        </Button>
      </div>
      <div className="find-row" data-slot="spreadsheet-find-row">
        <Label htmlFor={replaceInputId}>{t('flux.spreadsheet.replace')}</Label>
        <Input
          id={replaceInputId}
          data-slot="spreadsheet-replace-input"
          size="sm"
          value={props.replaceText}
          onChange={(e) => props.onReplaceTextChange(e.target.value)}
          placeholder="Replace with..."
        />
        <Button
          variant="ghost"
          size="xs"
          onClick={props.onReplace}
          disabled={!props.hasSelection || props.readOnly}
        >
          {t('flux.spreadsheet.replaceBtn')}
        </Button>
        <Button variant="ghost" size="xs" onClick={props.onReplaceAll} disabled={props.readOnly}>
          {t('flux.spreadsheet.replaceAll')}
        </Button>
      </div>
      {props.findResults ? (
        <div className="find-results" data-slot="spreadsheet-find-results">
          {props.findResults}
        </div>
      ) : null}
    </div>
  );
}
