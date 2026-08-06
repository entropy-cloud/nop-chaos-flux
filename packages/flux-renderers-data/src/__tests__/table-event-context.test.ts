import { describe, expect, it, vi } from 'vitest';
import { createTableEventContext } from '../table-renderer/table-event-context.js';

describe('createTableEventContext — evaluationBindings overlay instead of child scope (09-02)', () => {
  it('builds ctx from event + evaluationBindings + root scope without creating a child scope', () => {
    const createScope = vi.fn(() => ({ id: 'child-scope' }));
    const rootScope = { id: 'root-scope' } as never;
    const payload = {
      type: 'table:page-change',
      page: 2,
      pageSize: 10,
      pagination: { currentPage: 2, pageSize: 10 },
    };

    const ctx = createTableEventContext(payload, {
      scope: rootScope,
      event: payload,
    });

    expect(createScope).not.toHaveBeenCalled();
    expect(ctx).toEqual({
      event: payload,
      evaluationBindings: payload,
      scope: rootScope,
    });
  });
});
