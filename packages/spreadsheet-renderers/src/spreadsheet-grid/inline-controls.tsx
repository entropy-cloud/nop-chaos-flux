import { Input } from '@nop-chaos/ui';

export interface SpreadsheetCellEditorProps {
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function SpreadsheetCellEditor({
  value,
  readOnly,
  onChange,
  onSave,
  onCancel,
}: SpreadsheetCellEditorProps) {
  return (
    <Input
      type="text"
      className="ss-cell-edit-input"
      data-slot="spreadsheet-cell-editor-input"
      size="sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSave}
      readOnly={readOnly}
      disabled={readOnly}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSave();
        } else if (e.key === 'Escape') {
          onCancel();
        }
      }}
    />
  );
}

export interface SpreadsheetEditStatusProps {
  state?: { status: 'idle' | 'saving' | 'cancelled' | 'failed'; message?: string };
}

export function SpreadsheetEditStatus({ state }: SpreadsheetEditStatusProps) {
  if (!state || state.status === 'idle') {
    return null;
  }

  return (
    <div
      className="ss-edit-status"
      data-slot="spreadsheet-edit-status"
      data-status={state.status}
      role={state.status === 'failed' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {state.message}
    </div>
  );
}
