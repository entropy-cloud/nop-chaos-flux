import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableSummaryRowView } from '../table-renderer/table-summary-row.js';

afterEach(() => cleanup());

const fixedColumnLayoutStub = {
  getExpandCellProps: () => ({ className: '', style: undefined }),
  getSelectionCellProps: () => ({ className: '', style: undefined }),
  getColumnCellProps: () => ({ className: '', style: undefined }),
} as never;

describe('table summary expression observability (WA-data-009)', () => {
  it('renders an empty cell and warns once when a summary expression throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parentProps = {
      helpers: {
        evaluate: () => {
          throw new Error('summary eval exploded');
        },
      },
      node: { scope: {} },
    } as never;

    render(
      <table>
        <tbody>
          <TableSummaryRowView
            row={{
              variant: 'affix',
              cells: [{ column: 'name', value: { expr: 'sum(amount)' } }],
            } as never}
            variant="affix"
            columns={[{ name: 'name', label: 'Name' } as never]}
            showExpandColumn={false}
            hasSelection={false}
            fixedColumnLayout={fixedColumnLayoutStub}
            parentProps={parentProps}
          />
        </tbody>
      </table>,
    );

    // Degradation stays: the cell renders empty instead of crashing the table.
    const cell = screen.getByText('', { selector: '[data-slot="table-summary-cell"]' });
    expect(cell).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('summary expression'));
    warn.mockRestore();
  });
});
