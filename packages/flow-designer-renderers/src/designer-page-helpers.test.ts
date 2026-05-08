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

    expect(result).toEqual({ ok: false });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
