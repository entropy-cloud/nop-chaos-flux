import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NativeSelect, NativeSelectOption } from './native-select';

describe('NativeSelect', () => {
  it('renders wrapper, select, and icon slots', () => {
    render(
      <NativeSelect aria-label="Region" defaultValue="apac">
        <NativeSelectOption value="apac">APAC</NativeSelectOption>
        <NativeSelectOption value="emea">EMEA</NativeSelectOption>
      </NativeSelect>,
    );

    const select = screen.getByRole('combobox', { name: 'Region' });
    expect(select.getAttribute('data-slot')).toBe('native-select');
    expect(select.parentElement?.getAttribute('data-slot')).toBe('native-select-wrapper');
    expect(select.parentElement?.querySelector('[data-slot="native-select-icon"]')).toBeTruthy();
  });

  it('preserves disabled and change behavior as public contract', () => {
    const onChange = vi.fn();
    render(
      <NativeSelect aria-label="Status" disabled onChange={onChange}>
        <NativeSelectOption value="online">Online</NativeSelectOption>
        <NativeSelectOption value="offline">Offline</NativeSelectOption>
      </NativeSelect>,
    );

    const select = screen.getByRole('combobox', { name: 'Status' });
    expect((select as HTMLSelectElement).disabled).toBe(true);

    fireEvent.change(select, { target: { value: 'offline' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
