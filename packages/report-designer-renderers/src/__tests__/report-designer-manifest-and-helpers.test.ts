import { type DragEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { ReportDesignerCore, ReportDesignerRuntimeSnapshot } from '@nop-chaos/report-designer-core';
import {
  resolveReportDesignerManifest,
  REPORT_DESIGNER_CAPABILITY_PUBLICATION,
} from '../report-designer-manifest.js';
import { useReportDesignerHostScope } from '../host-data.js';
import {
  readReportFieldDragPayload,
  writeReportFieldDragPayload,
  REPORT_FIELD_DRAG_MIME,
  createReportFieldDragPayload,
} from '../report-field-panel.js';

vi.mock('@nop-chaos/flux-react', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flux-react')>('@nop-chaos/flux-react');
  return {
    ...actual,
    useHostScope: (_scopeData: unknown, _path: string, _label: string): ScopeRef =>
      ({ id: 'mock-scope', path: '/mock', value: {} }) as ScopeRef,
  };
});

describe('resolveReportDesignerManifest', () => {
  it('returns manifest for 1.0 version', () => {
    const manifest = resolveReportDesignerManifest('1.0');
    expect(manifest).toBeDefined();
    expect(manifest!.family).toBe('report-designer');
    expect(manifest!.version).toBe('1.0');
  });

  it('returns manifest for 1 version', () => {
    const manifest = resolveReportDesignerManifest('1');
    expect(manifest).toBeDefined();
    expect(manifest!.version).toBe('1.0');
  });

  it('returns manifest for latest version', () => {
    const manifest = resolveReportDesignerManifest('latest');
    expect(manifest).toBeDefined();
    expect(manifest!.version).toBe('1.0');
  });

  it('returns undefined for unknown version', () => {
    expect(resolveReportDesignerManifest('2.0')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(resolveReportDesignerManifest('')).toBeUndefined();
  });
});

describe('REPORT_DESIGNER_CAPABILITY_PUBLICATION', () => {
  it('has correct mode region-scoped', () => {
    expect(REPORT_DESIGNER_CAPABILITY_PUBLICATION.mode).toBe('region-scoped');
  });

  it('has expected capableRegions array', () => {
    expect(REPORT_DESIGNER_CAPABILITY_PUBLICATION.capableRegions).toEqual([
      'toolbar',
      'fieldPanel',
      'inspector',
      'dialogs',
      'body',
    ]);
  });

  it('has transitiveInheritance = true', () => {
    expect(REPORT_DESIGNER_CAPABILITY_PUBLICATION.transitiveInheritance).toBe(true);
  });
});

describe('useReportDesignerHostScope', () => {
  it('returns a ScopeRef', () => {
    const core = { getSnapshot: () => ({}) } as unknown as ReportDesignerCore;
    const snapshot = {
      document: {
        kind: 'report-template',
        id: 'doc-1',
        name: 'Test Report',
        spreadsheet: { workbook: { sheets: [] } },
      },
      dirty: false,
      canUndo: false,
      canRedo: false,
      selectionTarget: undefined,
      inspector: { open: false, loading: false },
      fieldDrag: {},
      preview: { running: false },
      activeMeta: undefined,
      fieldSources: [],
      fieldSourceCount: 0,
    } as unknown as ReportDesignerRuntimeSnapshot;

    const { result } = renderHook(() =>
      useReportDesignerHostScope(core, snapshot, '/test'),
    );

    expect(result.current).toBeDefined();
    expect(result.current.id).toBe('mock-scope');
    expect(result.current.path).toBe('/mock');
  });
});

describe('createReportFieldDragPayload', () => {
  it('creates a payload with the correct shape', () => {
    const source = { id: 'orders', label: 'Orders', groups: [] };
    const field = { id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' };

    const payload = createReportFieldDragPayload(source, field);

    expect(payload).toEqual({
      type: 'number',
      sourceId: 'orders',
      fieldId: 'orderId',
      label: 'Order ID',
      data: { id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' },
    });
  });

  it('defaults type to "field" when fieldType is undefined', () => {
    const source = { id: 'orders', label: 'Orders', groups: [] };
    const field = { id: 'orderId', label: 'Order ID' };

    const payload = createReportFieldDragPayload(source, field);

    expect(payload.type).toBe('field');
    expect(payload.data).toEqual({ id: 'orderId', label: 'Order ID' });
  });

  it('preserves extra meta properties from field in data', () => {
    const source = { id: 'ds', label: 'DS', groups: [] };
    const field = { id: 'f1', label: 'Field 1', fieldType: 'string', meta: { format: 'date' } };

    const payload = createReportFieldDragPayload(source, field);

    expect(payload.data).toEqual({ id: 'f1', label: 'Field 1', fieldType: 'string', meta: { format: 'date' } });
  });
});

describe('writeReportFieldDragPayload', () => {
  it('writes the payload to dataTransfer with the correct mime type', () => {
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: 'none',
      setData,
    } as unknown as DataTransfer;

    const payload = { type: 'number', sourceId: 'orders', fieldId: 'orderId', label: 'Order ID', data: { id: 'orderId', label: 'Order ID' } };

    writeReportFieldDragPayload({ dataTransfer } as unknown as DragEvent<HTMLElement>, payload);

    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(setData).toHaveBeenCalledWith(REPORT_FIELD_DRAG_MIME, JSON.stringify(payload));
    expect(setData).toHaveBeenCalledWith('text/plain', 'Order ID');
  });

  it('writes an empty label as plain text when label is empty string', () => {
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: 'none',
      setData,
    } as unknown as DataTransfer;

    const payload = { type: 'field', sourceId: 's', fieldId: 'f', label: '', data: { id: 'f', label: '' } };

    writeReportFieldDragPayload({ dataTransfer } as unknown as DragEvent<HTMLElement>, payload);

    expect(setData).toHaveBeenCalledWith('text/plain', '');
  });
});

describe('readReportFieldDragPayload', () => {
  it('returns undefined when event dataTransfer is null', () => {
    const event = { dataTransfer: null } as unknown as DragEvent<HTMLElement>;
    expect(readReportFieldDragPayload(event)).toBeUndefined();
  });

  it('returns undefined when no payload data', () => {
    const dataTransfer = { getData: () => '' } as unknown as DataTransfer;
    const event = { dataTransfer } as unknown as DragEvent<HTMLElement>;
    expect(readReportFieldDragPayload(event)).toBeUndefined();
  });

  it('returns parsed payload for valid drag event', () => {
    const payload = {
      type: 'field',
      sourceId: 'orders',
      fieldId: 'orderId',
      label: 'Order ID',
      data: { id: 'orderId' },
    };
    const dataTransfer = {
      getData: (mime: string) =>
        mime === REPORT_FIELD_DRAG_MIME ? JSON.stringify(payload) : '',
    } as unknown as DataTransfer;
    const event = { dataTransfer } as unknown as DragEvent<HTMLElement>;
    expect(readReportFieldDragPayload(event)).toEqual(payload);
  });

  it('returns undefined for malformed JSON payload', () => {
    const dataTransfer = {
      getData: () => '{not-json}',
    } as unknown as DataTransfer;
    const event = { dataTransfer } as unknown as DragEvent<HTMLElement>;
    expect(readReportFieldDragPayload(event)).toBeUndefined();
  });

  it('returns undefined for invalid payload shape (missing required fields)', () => {
    const dataTransfer = {
      getData: () =>
        JSON.stringify({ type: 'field', sourceId: 'orders' }),
    } as unknown as DataTransfer;
    const event = { dataTransfer } as unknown as DragEvent<HTMLElement>;
    expect(readReportFieldDragPayload(event)).toBeUndefined();
  });
});
