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
      <div data-slot="code-editor-result-panel" data-state="loading">
        <Spinner className="size-4" />
        Executing...
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div data-slot="code-editor-result-panel" data-state="error">
        <div data-slot="code-editor-result-header">
          <span>Error</span>
          {onClose && (
            <Button data-slot="code-editor-result-close" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
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
    <div data-slot="code-editor-result-panel" data-state="success">
      <div data-slot="code-editor-result-header">
        <span>Result ({result.data.length} rows)</span>
        {onClose && (
          <Button data-slot="code-editor-result-close" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
            <XIcon />
          </Button>
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
