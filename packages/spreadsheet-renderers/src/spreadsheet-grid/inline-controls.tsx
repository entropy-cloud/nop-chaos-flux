import { useLayoutEffect, useRef } from 'react';

export interface SpreadsheetCellEditorProps {
  /** Seed for a fresh editing session; the uncontrolled input owns it afterwards. */
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || readOnly) {
      return;
    }

    input.focus();
    // 光标置尾（不 select 全选）：type-to-edit 种子字符后须追加后续键入，
    // 全选会让下一个输入字符替换掉种子（"hi"→"i"、公式只余尾字符）。
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [readOnly]);

  return (
    // Spreadsheet inline editing is a documented canvas-density exception: the editor must
    // match the fixed 22px cell box exactly, which the shared Input size contract does not.
    <input
      ref={inputRef}
      type="text"
      className="ss-cell-edit-input"
      data-slot="spreadsheet-cell-editor-input"
      defaultValue={value}
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
