import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table.js';

afterEach(() => {
  cleanup();
});

describe('Table', () => {
  it('renders semantic table slots and row variant classes', () => {
    render(
      <Table>
        <TableCaption>Quarterly revenue</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow variant="interactive">
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole('table');
    expect(table.getAttribute('data-slot')).toBe('table');
    expect(table.closest('[data-slot="table-container"]')).toBeTruthy();
    const [headerGroup, bodyGroup] = screen.getAllByRole('rowgroup');
    expect(headerGroup.getAttribute('data-slot')).toBe('table-header');
    expect(bodyGroup.getAttribute('data-slot')).toBe('table-body');
    expect(screen.getByText('Alice').closest('[data-slot="table-row"]')?.className).toContain('cursor-pointer');
    expect(screen.getByText('Quarterly revenue').getAttribute('data-slot')).toBe('table-caption');
  });
});
