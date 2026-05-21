import { describe, expect, it, vi } from 'vitest';
import { confirmCreateDialog } from './designer-page-helpers.js';

describe('confirmCreateDialog', () => {
  it('returns ok:false when create dialog submitAction returns explicit ok:false', async () => {
    const dispatch = vi.fn();

    const result = await confirmCreateDialog({
      pendingCreateDialog: {
        nodeType: {
          id: 'task',
          defaults: { label: 'Task' },
          createDialog: {
            submitAction: { action: 'save' } as any,
          },
        } as any,
        position: { x: 10, y: 20 },
      },
      helpers: {
        dispatch: vi.fn().mockResolvedValue({ ok: false, error: new Error('blocked') }),
      } as any,
      designerScope: {} as any,
      actionScope: undefined,
      dispatch,
    });

    expect(result).toEqual({
      ok: false,
      result: expect.objectContaining({ ok: false, error: expect.any(Error) }),
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('preserves the full failed submit action result for create dialogs', async () => {
    const dispatch = vi.fn();
    const failedResult = {
      ok: false,
      cancelled: true,
      timedOut: true,
      cause: { reason: 'timeout' },
      error: new Error('create cancelled'),
    };

    const result = await confirmCreateDialog({
      pendingCreateDialog: {
        nodeType: {
          id: 'task',
          createDialog: {
            submitAction: { action: 'save' } as any,
          },
        } as any,
        position: { x: 10, y: 20 },
      },
      helpers: {
        dispatch: vi.fn().mockResolvedValue(failedResult),
      } as any,
      designerScope: {} as any,
      actionScope: undefined,
      dispatch,
    });

    expect(result).toEqual({ ok: false, result: failedResult });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
