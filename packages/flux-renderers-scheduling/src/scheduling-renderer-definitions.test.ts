import { describe, it, expect } from 'vitest';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';

describe('schedulingRendererDefinitions', () => {
  it('should export an array of RendererDefinition', () => {
    expect(Array.isArray(schedulingRendererDefinitions)).toBe(true);
  });

  it('should contain exactly 4 definitions (gantt, kanban, calendar, barcode-input)', () => {
    expect(schedulingRendererDefinitions).toHaveLength(4);
  });

  it('each definition should have required fields', () => {
    for (const def of schedulingRendererDefinitions) {
      expect(def).toHaveProperty('type');
      expect(def).toHaveProperty('displayName');
      expect(def).toHaveProperty('category');
      expect(def).toHaveProperty('sourcePackage');
      expect(def).toHaveProperty('defaultSchema');
      expect(def.type).toEqual(expect.any(String));
      expect(def.displayName).toEqual(expect.any(String));
      expect(def.category).toEqual(expect.any(String));
      expect(def.sourcePackage).toEqual(expect.any(String));
    }
  });

  it('definitions should have the correct types', () => {
    const types = schedulingRendererDefinitions.map((d) => d.type);
    expect(types).toContain('gantt');
    expect(types).toContain('kanban');
    expect(types).toContain('calendar');
    expect(types).toContain('barcode-input');
  });

  it('each definition should have sourcePackage set to @nop-chaos/flux-renderers-scheduling', () => {
    for (const def of schedulingRendererDefinitions) {
      expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-scheduling');
    }
  });

  describe('kanban field consumption', () => {
    const kanbanDef = schedulingRendererDefinitions.find(d => d.type === 'kanban')!;
    const knownConsumedOrReserved = new Set([
      'body', 'data', 'configMap', 'columnsConfig',
      'columnHeader', 'columnHeaderToolbar', 'cardTemplate', 'columnFooter',
      'empty', 'loading',
      'filterText', 'filterCard',
      'columnWidth', 'columnDraggable', 'draggable',
      'columnsOrderStatePath', 'columnsOrderOwnership',
      'collapsedStatePath', 'collapsedOwnership',
      'columnHeaderClassName', 'cardClassName', 'columnFooterClassName',
      'kanbanOwnership', 'kanbanStatePath', 'statusPath',
      'onMount', 'onUnmount',
      'onCardMove', 'onCardClick', 'onColumnReorder', 'onColumnClick',
      'onCardAdd', 'onCardRemove',
    ]);

    it('every registered kanban field is either consumed or documented as reserved', () => {
      const fields = kanbanDef.fields ?? [];
      for (const field of fields) {
        expect(knownConsumedOrReserved.has(field.key)).toBe(true);
      }
    });
  });

  describe('calendar field consumption', () => {
    const calendarDef = schedulingRendererDefinitions.find(d => d.type === 'calendar')!;
    const knownConsumedOrReserved = new Set([
      'view', 'date', 'events', 'resources',
      'firstDayOfWeek', 'showWeekends', 'maxConcurrent',
      'showCrossDayLines', 'timezoneSelector', 'batchScheduling',
      'resources[].resources', 'resources[].open',
      'eventTemplate', 'loading', 'empty', 'body',
      'headerClassName', 'eventClassName', 'emptyClassName',
      'onEventClick', 'onDateChange', 'onViewChange',
      'onEventChange', 'onEventCreate',
      'onBatchSchedule', 'onImport', 'onImportError',
      'onTimezoneChange', 'onGroupToggle',
      'viewOwnership', 'viewStatePath',
      'dateOwnership', 'dateStatePath',
      'statusPath', 'loadAction',
      'onMount', 'onUnmount',
      'component:print', 'component:exportPNG',
      'component:importICal', 'component:exportToICal',
    ]);

    it('every registered calendar field is either consumed or documented as reserved', () => {
      const fields = calendarDef.fields ?? [];
      for (const field of fields) {
        expect(knownConsumedOrReserved.has(field.key)).toBe(true);
      }
    });
  });
});
