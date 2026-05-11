import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NativeSelect, NativeSelectOption } from '../../index.js';

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

  it('exposes native disabled semantics without declaring synthetic change delivery as contract', () => {
    render(
      <NativeSelect aria-label="Status" disabled>
        <NativeSelectOption value="online">Online</NativeSelectOption>
        <NativeSelectOption value="offline">Offline</NativeSelectOption>
      </NativeSelect>,
    );

    const select = screen.getByRole('combobox', { name: 'Status' });
    expect((select as HTMLSelectElement).disabled).toBe(true);
    expect(select.getAttribute('data-slot')).toBe('native-select');
  });

  it('surfaces current value and forwards change when enabled', () => {
    const onChange = vi.fn();
    cleanup();
    render(
      <NativeSelect aria-label="Status" value="online" onChange={onChange}>
        <NativeSelectOption value="online">Online</NativeSelectOption>
        <NativeSelectOption value="offline">Offline</NativeSelectOption>
      </NativeSelect>,
    );

    const select = screen.getByRole('combobox', { name: 'Status' });
    expect((select as HTMLSelectElement).value).toBe('online');

    fireEvent.change(select, { target: { value: 'offline' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((select as HTMLSelectElement).value).toBe('online');
  });
});
