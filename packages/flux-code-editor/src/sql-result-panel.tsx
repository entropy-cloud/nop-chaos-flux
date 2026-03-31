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
        <span className="nop-code-editor__result-spinner" />
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
            <span
              role="button"
              tabIndex={0}
              className="nop-code-editor__result-close"
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); }
              }}
            >
              ×
            </span>
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
          <span
            role="button"
            tabIndex={0}
            className="nop-code-editor__result-close"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); }
            }}
          >
            ×
          </span>
        )}
      </div>
      <div className="nop-code-editor__result-table-wrapper">
        <table className="nop-code-editor__result-table">
          <thead>
            <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {result.data.map((row, i) => (
              <tr key={i}>
                {columns.map(col => <td key={col}>{String(row[col] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
