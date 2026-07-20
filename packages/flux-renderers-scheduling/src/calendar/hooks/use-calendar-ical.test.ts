import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCalendarICal } from './use-calendar-ical.js';

vi.mock('ical.js', () => {
  function ICalComponent() {
    return {
      type: 'vcalendar',
      props: {},
      subcomponents: [],
      updatePropertyWithValue: vi.fn(),
      getFirstPropertyValue: vi.fn(),
      addSubcomponent: vi.fn(),
      getAllSubcomponents: vi.fn(() => []),
      toString: vi.fn(() => 'BEGIN:VCALENDAR\nEND:VCALENDAR'),
    };
  }

  return {
    default: {
      parse: vi.fn(() => ({})),
      Component: ICalComponent,
    },
  };
});

describe('useCalendarICal', () => {
  it('should set isAvailable to true when ical.js loads', async () => {
    const { result } = renderHook(() => useCalendarICal());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });
  });

  it('should call onImportError when exportToICal called with empty events', async () => {
    const onImportError = vi.fn();
    const { result } = renderHook(() => useCalendarICal({ onImportError }));

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    await result.current.exportToICal([]);
    expect(onImportError).toHaveBeenCalledWith('没有可导出的排班数据');
  });

  it('should parse file and call onImport in importFromICal', async () => {
    const onImport = vi.fn();
    const { result } = renderHook(() => useCalendarICal({ onImport }));

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    const file = new File(['BEGIN:VCALENDAR\nEND:VCALENDAR'], 'test.ics', { type: 'text/calendar' });
    await result.current.importFromICal(file);

    expect(onImport).toHaveBeenCalled();
  });
});
