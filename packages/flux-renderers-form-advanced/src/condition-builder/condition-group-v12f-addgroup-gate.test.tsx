import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderGroup } from './config-test-support.js';

/**
 * V12f Phase 1 — [G2-R7-视角4-01] condition-group Add-Group 的
 * maxItemsPerGroup 门。atMaxItems 原先只门 Add-Condition 与分隔符，
 * Add-Group 在 full 模式下保持可用——嵌套组同为 children 成员，
 * 达到上限后仍可继续添加，绕过组内条目上限。
 */
afterEach(() => cleanup());

function atLimitValue() {
  return {
    id: 'g1',
    conjunction: 'and' as const,
    children: [
      {
        id: 'i1',
        left: { type: 'field' as const, field: 'name' },
        op: 'equal' as const,
        right: undefined,
      },
      {
        id: 'i2',
        left: { type: 'field' as const, field: 'age' },
        op: 'equal' as const,
        right: undefined,
      },
    ],
  };
}

describe('V12f [G2-R7-视角4-01] Add-Group respects maxItemsPerGroup', () => {
  it('hides Add-Group when the group is at maxItemsPerGroup (full mode)', () => {
    renderGroup({ maxItemsPerGroup: 2, builderMode: 'full' }, atLimitValue());
    expect(screen.queryAllByText('Add condition')).toHaveLength(0);
    // A nested group is a child of the group too — the cap gates it as well.
    expect(screen.queryAllByText('Add group')).toHaveLength(0);
  });

  it('adding a group from an at-limit group never exceeds the cap (runtime guard)', () => {
    const onChange = vi.fn();
    renderGroup({ maxItemsPerGroup: 2, builderMode: 'full' }, atLimitValue(), onChange);
    screen.queryAllByText('Add group').forEach((btn) => fireEvent.click(btn));
    screen.queryAllByText('Add condition').forEach((btn) => fireEvent.click(btn));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps Add-Group available when under the cap', () => {
    renderGroup(
      { maxItemsPerGroup: 3, builderMode: 'full' },
      {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      },
    );
    expect(screen.queryAllByText('Add group').length).toBeGreaterThanOrEqual(1);
  });
});
