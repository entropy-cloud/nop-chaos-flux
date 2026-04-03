import { Button, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';

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
      <div className="nop-code-editor__result-panel nop-code-editor__result-loading">
        <Spinner className="size-4" />
        Executing...
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="nop-code-editor__result-panel nop-code-editor__result-error">
        <div className="nop-code-editor__result-header">
          <span>Error</span>
          {onClose && (
            <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
              <XIcon />
            </Button>
          )}
        </div>
        <div>{result.message}</div>
      </div>
    );
  }

  const columns = result.columns ?? (result.data.length > 0 ? Object.keys(result.data[0]) : []);

  return (
    <div className="nop-code-editor__result-panel">
      <div className="nop-code-editor__result-header">
        <span>Result ({result.data.length} rows)</span>
        {onClose && (
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
            <XIcon />
          </Button>
        )}
      </div>
      <div className="nop-code-editor__result-table-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((row, i) => (
              <TableRow key={i}>
                {columns.map(col => <TableCell key={col}>{String(row[col] ?? '')}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
