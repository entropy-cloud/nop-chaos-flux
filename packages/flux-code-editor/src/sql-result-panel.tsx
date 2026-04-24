import { Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { XIcon } from 'lucide-react';
import { ToolbarButton } from './code-editor-renderer/toolbar-button';

export type SQLResultState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Record<string, unknown>[]; columns?: string[] }
  | { status: 'error'; message: string };

interface SQLResultPanelProps {
  result: SQLResultState;
  onClose?: () => void;
}

export function SQLResultPanel({ result, onClose }: SQLResultPanelProps) {
  if (result.status === 'idle') return null;

  if (result.status === 'loading') {
    return (
      <div data-slot="code-editor-result-panel" data-state="loading">
        <Spinner className="size-4" />
        {t('flux.codeEditor.executing')}
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div data-slot="code-editor-result-panel" data-state="error">
        <div data-slot="code-editor-result-header">
          <span>{t('flux.codeEditor.error')}</span>
          {onClose && (
            <ToolbarButton data-slot="code-editor-result-close" onClick={onClose} aria-label="Close">
              <XIcon />
            </ToolbarButton>
          )}
        </div>
        <div>{result.message}</div>
      </div>
    );
  }

  const columns = result.columns ?? (result.data.length > 0 ? Object.keys(result.data[0]) : []);

  return (
    <div data-slot="code-editor-result-panel" data-state="success">
      <div data-slot="code-editor-result-header">
        <span>{t('flux.codeEditor.resultRows', { count: result.data.length })}</span>
        {onClose && (
          <ToolbarButton data-slot="code-editor-result-close" onClick={onClose} aria-label="Close">
            <XIcon />
          </ToolbarButton>
        )}
      </div>
      <div data-slot="code-editor-result-table-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((row, index) => {
              const rowKey = row.id ?? row.key ?? `row-${index}`

              return (
                <TableRow key={String(rowKey)}>
                  {columns.map(col => <TableCell key={col}>{String(row[col] ?? '')}</TableCell>)}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
