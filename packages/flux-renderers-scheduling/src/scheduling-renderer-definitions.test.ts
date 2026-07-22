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
});

describe('gantt field consumption verification', () => {
  const ganttDef = schedulingRendererDefinitions.find(d => d.type === 'gantt')!;
  const fields = ganttDef.fields ?? [];

  const ganttEventFields = fields.filter(f => f.kind === 'event').map(f => f.key);
  it('all gantt event fields fire at interaction points', () => {
    const expectedEvents = ['onTaskClick', 'onTaskDoubleClick', 'onTaskDragEnd', 'onLinkClick', 'onLinkDragEnd', 'onEmptyCellClick', 'onZoomChange', 'onScroll'];
    for (const evt of expectedEvents) {
      expect(ganttEventFields).toContain(evt);
    }
  });

  const ganttRegionFields = fields.filter(f => f.kind === 'region').map(f => f.key);
  it('gantt region fields are rendered', () => {
    expect(ganttRegionFields).toContain('loading');
    expect(ganttRegionFields).toContain('empty');
    expect(ganttRegionFields).toContain('taskBar');
    expect(ganttRegionFields).toContain('toolbar');
    expect(ganttRegionFields).toContain('editor');
  });

  const ganttPropFields = fields.filter(f => f.kind === 'prop').map(f => f.key);
  it('gantt consumes all declared props', () => {
    const expectedProps = ['draggable', 'editable', 'linkable', 'calendar', 'progressBarHeight', 'childrenField', 'initiallyExpanded', 'startDate', 'endDate',
      'toolbarClassName', 'taskBarClassName', 'editorClassName', 'emptyClassName'];
    for (const prop of expectedProps) {
      expect(ganttPropFields).toContain(prop);
    }
  });
});

describe('kanban field consumption verification', () => {
  const kanbanDef = schedulingRendererDefinitions.find(d => d.type === 'kanban')!;
  const fields = kanbanDef.fields ?? [];

  const kanbanEventFields = fields.filter(f => f.kind === 'event').map(f => f.key);
  it('all kanban event fields fire at interaction points', () => {
    const expectedEvents = ['onCardMove', 'onCardClick', 'onColumnReorder', 'onColumnClick', 'onCardAdd', 'onCardRemove'];
    for (const evt of expectedEvents) {
      expect(kanbanEventFields).toContain(evt);
    }
  });

  const kanbanPropFields = fields.filter(f => f.kind === 'prop').map(f => f.key);
  it('kanban consumes all declared props', () => {
    const expectedProps = ['columnDraggable', 'draggable', 'columnsConfig', 'configMap'];
    for (const prop of expectedProps) {
      expect(kanbanPropFields).toContain(prop);
    }
  });
});

describe('calendar field consumption verification', () => {
  const calendarDef = schedulingRendererDefinitions.find(d => d.type === 'calendar')!;
  const fields = calendarDef.fields ?? [];

  const calendarEventFields = fields.filter(f => f.kind === 'event').map(f => f.key);
  it('all calendar event fields fire at interaction points', () => {
    const expectedEvents = ['onEventClick', 'onDateChange', 'onViewChange', 'onEventChange', 'onEventCreate', 'onGroupToggle'];
    for (const evt of expectedEvents) {
      expect(calendarEventFields).toContain(evt);
    }
  });

  const calendarRegionFields = fields.filter(f => f.kind === 'region').map(f => f.key);
  it('calendar renders loading/empty/body regions', () => {
    expect(calendarRegionFields).toContain('loading');
    expect(calendarRegionFields).toContain('empty');
    expect(calendarRegionFields).toContain('body');
  });
});

describe('barcode-input field consumption verification', () => {
  const barcodeDef = schedulingRendererDefinitions.find(d => d.type === 'barcode-input')!;
  const fields = barcodeDef.fields ?? [];

  it('barcode-input lifecycle events use event kind', () => {
    const onMountField = fields.find(f => f.key === 'onMount');
    const onUnmountField = fields.find(f => f.key === 'onUnmount');
    expect(onMountField?.kind).toBe('event');
    expect(onUnmountField?.kind).toBe('event');
  });

  it('barcode-input declares all required props', () => {
    const propKeys = fields.filter(f => f.kind === 'prop').map(f => f.key);
    expect(propKeys).toContain('formats');
    expect(propKeys).toContain('continuousScan');
    expect(propKeys).toContain('batchMode');
    expect(propKeys).toContain('scanOnFocus');
    expect(propKeys).toContain('scanButton');
    expect(propKeys).toContain('scanInterval');
  });
});
