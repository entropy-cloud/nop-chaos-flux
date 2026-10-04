import { describe, expect, it, vi } from 'vitest';

vi.mock('leafer-ui', () => ({
  Rect: class {},
  Ellipse: class {},
  Line: class {},
  Group: class {},
  Text: class {},
  Image: class {},
}));
import {
  createDesignerRegistry,
  DASHBOARD_DEMO_RECIPE,
  REPORT_DESIGNER_DEMO_RECIPE,
  SCADA_EDITOR_DEMO_RECIPE,
  TASKFLOW_DESIGNER_PAGE_RECIPE,
  WORD_EDITOR_PAGE_RECIPE,
} from './registry-factory.js';

describe('designer registry factory (P4.4)', () => {
  it('word-editor recipe registers representative types', () => {
    const registry = createDesignerRegistry(WORD_EDITOR_PAGE_RECIPE);
    expect(registry.has('word-editor-page')).toBe(true);
    expect(registry.has('form')).toBe(true);
  });

  it('dashboard recipe registers representative types', () => {
    const registry = createDesignerRegistry(DASHBOARD_DEMO_RECIPE);
    expect(registry.has('dashboard-editor')).toBe(true);
    expect(registry.has('dashboard')).toBe(true);
  });

  it('scada recipe registers runtime + editor renderer types', () => {
    const registry = createDesignerRegistry(SCADA_EDITOR_DEMO_RECIPE);
    expect(registry.has('scada-canvas')).toBe(true);
    expect(registry.has('scada-editor-canvas')).toBe(true);
  });

  it('taskflow recipe registers designer-page type', () => {
    const registry = createDesignerRegistry(TASKFLOW_DESIGNER_PAGE_RECIPE);
    expect(registry.has('designer-page')).toBe(true);
  });

  it('report recipe registers report-designer-page type (shared by both report demos)', () => {
    for (const recipe of [REPORT_DESIGNER_DEMO_RECIPE]) {
      const registry = createDesignerRegistry(recipe);
      expect(registry.has('report-designer-page')).toBe(true);
    }
  });
});

describe('host-demo recipe extension (P4.4 definition entries)', () => {
  it('supports renderer-definition entries alongside register functions (array-variant semantics)', () => {
    const probeDefinition = { type: 'host-dirty-probe', component: () => null } as never;
    const registry = createDesignerRegistry({
      ...REPORT_DESIGNER_DEMO_RECIPE,
      register: [...REPORT_DESIGNER_DEMO_RECIPE.register, probeDefinition],
    });
    expect(registry.has('report-designer-page')).toBe(true);
    expect(registry.has('host-dirty-probe')).toBe(true);
  });
});
