import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFieldDrop } from './use-field-drop.js';
import { useKeyboard } from './use-keyboard.js';

function KeyboardHarness(props: { onError: (error: unknown) => void; copy?: () => Promise<void> }) {
  useKeyboard(
    { row: 0, col: 0 },
    props.copy ?? (async () => undefined),
    async () => undefined,
    async () => undefined,
    async () => undefined,
    async () => undefined,
    async () => undefined,
    async () => undefined,
    props.onError,
    () => undefined,
    () => undefined,
  );

  return <div data-testid="keyboard-harness" />;
}

function FieldDropHarness(props: { onReady: (api: ReturnType<typeof useFieldDrop>) => void }) {
  const api = useFieldDrop({ row: 1, col: 2 });
  React.useEffect(() => {
    props.onReady(api);
  }, [api, props]);
  return <div data-testid="field-drop-harness" />;
}

describe('spreadsheet async interaction guards', () => {
  it('routes keyboard command rejections to the provided error handler', async () => {
    const onError = vi.fn();
    render(<KeyboardHarness onError={onError} copy={async () => Promise.reject(new Error('Copy failed'))} />);

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Copy failed' }));
    });
  });

  it('keeps the drop target when async field drop fails', async () => {
    let fieldDropApi: ReturnType<typeof useFieldDrop> | undefined;
    render(<FieldDropHarness onReady={(api) => void (fieldDropApi = api)} />);

    await waitFor(() => expect(fieldDropApi).toBeTruthy());

    fieldDropApi!.handleFieldDragOver(4, 5);

    await expect(
      fieldDropApi!.handleFieldDrop(async () => {
        throw new Error('Drop failed');
      }),
    ).rejects.toThrow('Drop failed');

    await waitFor(() => {
      expect(fieldDropApi!.dropTargetCellRef.current).toEqual({ row: 4, col: 5 });
    });
  });
});
