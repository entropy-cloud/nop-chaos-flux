import { describe, expect, it } from 'vitest';
import { dataRendererDefinitions } from '../index.js';
import { crudRendererDefinition } from '../crud-renderer-definition.js';

describe('data renderer definition contracts', () => {
  const _LAYOUT_RENDERER_TYPES = new Set(['table', 'crud']);
  const _DATA_WIDGET_TYPES = new Set(['tree', 'chart']);

  it('every data renderer has a type and component', () => {
    for (const def of dataRendererDefinitions) {
      expect(def.type).toBeTruthy();
      expect(def.component).toBeTypeOf('function');
    }
  });

  it('table renderer has event fields for sort, filter, page, selection', () => {
    const table = dataRendererDefinitions.find((d) => d.type === 'table');
    const eventKeys = table?.fields?.filter((f) => f.kind === 'event').map((f) => f.key) ?? [];
    expect(eventKeys).toContain('onRowClick');
    expect(eventKeys).toContain('onSortChange');
    expect(eventKeys).toContain('onFilterChange');
    expect(eventKeys).toContain('onPageChange');
    expect(eventKeys).toContain('onSelectionChange');
    expect(eventKeys).toContain('onRefresh');
  });

  it('tree renderer has parameterized node region', () => {
    const tree = dataRendererDefinitions.find((d) => d.type === 'tree');
    const nodeField = tree?.fields?.find((f) => f.key === 'node');
    expect(nodeField?.kind).toBe('region');
    expect(nodeField?.params).toEqual(['node', 'index', 'depth', 'key', 'parentNode']);
  });

  it('chart has onClick and onHover events', () => {
    const chart = dataRendererDefinitions.find((d) => d.type === 'chart');
    expect(chart?.fields?.some((f) => f.key === 'onClick' && f.kind === 'event')).toBe(true);
    expect(chart?.fields?.some((f) => f.key === 'onHover' && f.kind === 'event')).toBe(true);
  });

  it('crud is a flux-owner-renderer with composite traits', () => {
    expect(crudRendererDefinition.rendererClass).toBe('flux-owner-renderer');
    expect(crudRendererDefinition.rendererTraits).toContain('composite');
  });

  it('crud has scope exports for $crud', () => {
    expect(crudRendererDefinition.scopeExportContracts?.$crud?.kind).toBe('object');
  });

  it('crud has component capabilities: refresh, getSelection, clearSelection', () => {
    const handles = crudRendererDefinition.componentCapabilityContracts?.map((c) => c.handle);
    expect(handles).toContain('refresh');
    expect(handles).toContain('getSelection');
    expect(handles).toContain('clearSelection');
  });

  it('crud event contracts include onSelectionChange with payload shape', () => {
    expect(crudRendererDefinition.eventContracts?.onSelectionChange?.payload?.kind).toBe('object');
  });

  it('no data renderer has hostContract', () => {
    for (const def of dataRendererDefinitions) {
      expect(def.hostContract).toBeUndefined();
    }
  });

  it('table renderer has value-or-region fields for empty and loadingSlot', () => {
    const table = dataRendererDefinitions.find((d) => d.type === 'table');
    expect(
      table?.fields?.some((f) => f.key === 'empty' && f.kind === 'value-or-region'),
    ).toBe(true);
    expect(
      table?.fields?.some((f) => f.key === 'loadingSlot' && f.kind === 'value-or-region'),
    ).toBe(true);
  });
});
