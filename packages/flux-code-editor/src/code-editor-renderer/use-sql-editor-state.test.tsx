import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSQLEditorState } from './use-sql-editor-state.js';

function createView(sql: string) {
  return {
    state: {
      doc: {
        toString: () => sql,
        length: sql.length,
      },
      selection: {
        main: {
          head: sql.length,
        },
      },
    },
    dispatch: vi.fn(),
    focus: vi.fn(),
  } as any;
}

function createProps(dispatch: ReturnType<typeof vi.fn>) {
  return {
    props: { value: '' },
    node: {
      scope: {
        get: vi.fn(),
      },
    },
    helpers: {
      dispatch,
    },
  } as any;
}

describe('useSQLEditorState', () => {
  it('aborts the previous execute request when a new run starts', async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst: ((value: any) => void) | undefined;
    let resolveSecond: ((value: any) => void) | undefined;
    const dispatch = vi
      .fn()
      .mockImplementationOnce((_action, ctx) => {
        signals.push(ctx.signal);
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      })
      .mockImplementationOnce((_action, ctx) => {
        signals.push(ctx.signal);
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      });

    const { result } = renderHook(() =>
      useSQLEditorState(
        createProps(dispatch),
        {
          execution: { enabled: true },
        } as any,
        createView('select 1'),
      ),
    );

    await act(async () => {
      void result.current.handleExecuteSQL();
    });

    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    await act(async () => {
      void result.current.handleExecuteSQL();
    });

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await act(async () => {
      resolveFirst?.({ ok: true, data: [{ stale: true }] });
      resolveSecond?.({ ok: true, data: [{ fresh: true }] });
      await Promise.resolve();
    });

    expect(result.current.sqlResult).toMatchObject({
      status: 'success',
      data: [{ fresh: true }],
      columns: ['fresh'],
    });
  });
});
