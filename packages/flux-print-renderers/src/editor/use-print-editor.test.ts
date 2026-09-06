import { describe, expect, it } from 'vitest';
import { createEmptyPrintTemplate, type PrintElementSchema, type PrintTemplateSchema } from '@nop-chaos/flux-print-core';
import { createPrintEditorController, PASTE_OFFSET_MM } from './use-print-editor.js';

function baseTemplate(elements: PrintElementSchema[] = []): PrintTemplateSchema {
  return { ...createEmptyPrintTemplate(), elements };
}

function makeController(template?: PrintTemplateSchema, onTemplateChange?: (t: PrintTemplateSchema, s: string) => void) {
  return createPrintEditorController({
    template: template ?? baseTemplate(),
    onTemplateChange,
  });
}

describe('PrintEditorController - elements', () => {
  it('adds an element with defaults, selects it, and keeps it undoable', () => {
    const controller = makeController();
    const created = controller.addElement('text');
    expect(created).not.toBeNull();
    expect(controller.getSelection()).toEqual([created!.id]);
    expect(controller.getTemplate().elements).toHaveLength(1);

    controller.undo();
    expect(controller.getTemplate().elements).toHaveLength(0);
    controller.redo();
    expect(controller.getTemplate().elements).toHaveLength(1);
    controller.dispose();
  });

  it('updates element via patch and restores on undo', () => {
    const controller = makeController(baseTemplate([{
      type: 'text', id: 't1', region: 'body', left: 0, top: 0, width: 40, height: 8, style: {}, text: 'a',
    } as PrintElementSchema]));
    controller.updateElement('t1', { left: 12, top: 6 } as Partial<PrintElementSchema>);
    const updated = controller.getTemplate().elements[0];
    expect(updated).toMatchObject({ left: 12, top: 6 });
    controller.undo();
    expect(controller.getTemplate().elements[0]).toMatchObject({ left: 0, top: 0 });
    controller.dispose();
  });

  it('deletes selected elements and clears selection', () => {
    const controller = makeController(baseTemplate([
      { type: 'rect', id: 'a', region: 'body', left: 0, top: 0, width: 5, height: 5, style: {} } as PrintElementSchema,
      { type: 'rect', id: 'b', region: 'body', left: 9, top: 9, width: 5, height: 5, style: {} } as PrintElementSchema,
    ]));
    controller.setSelection(['a']);
    controller.deleteSelected();
    expect(controller.getTemplate().elements.map((e) => e.id)).toEqual(['b']);
    expect(controller.getSelection()).toEqual([]);
    controller.undo();
    expect(controller.getTemplate().elements).toHaveLength(2);
    controller.dispose();
  });

  it('copies and pastes with fresh ids and paste offset', () => {
    const controller = makeController(baseTemplate([
      { type: 'rect', id: 'a', region: 'body', left: 5, top: 5, width: 5, height: 5, style: {} } as PrintElementSchema,
    ]));
    controller.setSelection(['a']);
    controller.copy();
    controller.paste();
    const elements = controller.getTemplate().elements;
    expect(elements).toHaveLength(2);
    expect(elements[1]!.id).not.toBe('a');
    expect(elements[1]).toMatchObject({ left: 5 + PASTE_OFFSET_MM, top: 5 + PASTE_OFFSET_MM });
    expect(controller.getSelection()).toEqual([elements[1]!.id]);
    controller.dispose();
  });

  it('nudges selected elements by the given delta', () => {
    const controller = makeController(baseTemplate([
      { type: 'rect', id: 'a', region: 'body', left: 5, top: 5, width: 5, height: 5, style: {} } as PrintElementSchema,
      { type: 'rect', id: 'b', region: 'body', left: 0, top: 0, width: 5, height: 5, style: {} } as PrintElementSchema,
    ]));
    controller.setSelection(['a']);
    controller.nudge(1, -0.5);
    expect(controller.getTemplate().elements[0]).toMatchObject({ left: 6, top: 4.5 });
    expect(controller.getTemplate().elements[1]).toMatchObject({ left: 0, top: 0 });
    controller.dispose();
  });
});

describe('PrintEditorController - drag transaction', () => {
  it('collapses a drag into a single undo step', () => {
    const controller = makeController(baseTemplate([
      { type: 'rect', id: 'a', region: 'body', left: 0, top: 0, width: 5, height: 5, style: {} } as PrintElementSchema,
    ]));
    const depthBefore = controller.getState().undoDepth;

    controller.beginDrag();
    controller.moveFrame('a', { left: 1, top: 1, width: 5, height: 5 });
    controller.moveFrame('a', { left: 2, top: 2, width: 5, height: 5 });
    controller.moveFrame('a', { left: 3, top: 3, width: 5, height: 5 });
    controller.endDrag();

    expect(controller.getState().undoDepth).toBe(depthBefore + 1);
    expect(controller.getTemplate().elements[0]).toMatchObject({ left: 3, top: 3 });
    controller.undo();
    expect(controller.getTemplate().elements[0]).toMatchObject({ left: 0, top: 0 });
    controller.dispose();
  });

  it('abortDrag rolls back without pushing undo', () => {
    const controller = makeController(baseTemplate([
      { type: 'rect', id: 'a', region: 'body', left: 0, top: 0, width: 5, height: 5, style: {} } as PrintElementSchema,
    ]));
    const depthBefore = controller.getState().undoDepth;
    controller.beginDrag();
    controller.moveFrame('a', { left: 9, top: 9, width: 5, height: 5 });
    controller.abortDrag();
    expect(controller.getState().undoDepth).toBe(depthBefore);
    expect(controller.getTemplate().elements[0]).toMatchObject({ left: 0, top: 0 });
    controller.dispose();
  });
});

describe('PrintEditorController - zoom and document-level fields', () => {
  it('keeps zoom independent from the document undo stack', () => {
    const controller = makeController();
    controller.setZoom(1.5);
    expect(controller.getZoom()).toBe(1.5);
    controller.addElement('text');
    controller.undo();
    expect(controller.getZoom()).toBe(1.5);
    controller.setZoom(99);
    expect(controller.getZoom()).toBe(4);
    controller.setZoom(0.01);
    expect(controller.getZoom()).toBe(0.1);
    controller.dispose();
  });

  it('updates page settings and test data', () => {
    const controller = makeController();
    controller.updatePage({ headerHeight: 12 });
    controller.setTestData({ name: 'x' });
    expect(controller.getTemplate().page.headerHeight).toBe(12);
    expect(controller.getTemplate().testData).toEqual({ name: 'x' });
    controller.undo();
    expect(controller.getTemplate().testData).toBeUndefined();
    controller.dispose();
  });
});

describe('PrintEditorController - commit and validation', () => {
  it('fires onTemplateChange with working template and serialized JSON', () => {
    const changes: Array<{ name: string; serialized: string }> = [];
    const controller = createPrintEditorController({
      template: baseTemplate(),
      onTemplateChange: (template, serialized) => {
        changes.push({ name: template.name, serialized });
      },
    });
    controller.updatePage({ headerHeight: 8 });
    expect(changes).toHaveLength(1);
    expect(changes[0]!.serialized).toContain('"headerHeight":8');
    controller.dispose();
  });

  it('validates the working template through flux-print-core', () => {
    const controller = makeController();
    controller.addElement('pageNumber');
    controller.updateElement(controller.getSelection()[0]!, { region: 'body' } as Partial<PrintElementSchema>);
    const diagnostics = controller.validate();
    expect(diagnostics.map((d) => d.code)).toContain('PRINT_REGION_INVALID');
    controller.dispose();
  });
});

describe('D07-02 (P2): element id counter must be seeded from the loaded template', () => {
  it('red: adding text after loading a template containing text_1 does not collide', () => {
    const controller = createPrintEditorController({
      template: {
        ...baseTemplate(),
        elements: [{ type: 'text', id: 'text_1', region: 'body', left: 0, top: 0, width: 40, height: 8, style: {}, text: 'a' } as PrintElementSchema],
      },
    });
    const created = controller.addElement('text');
    expect(created!.id).not.toBe('text_1');
    // auto-commit 必须真实发生（撞号时 update 会静默失败）
    expect(controller.getState().undoDepth).toBe(1);
    controller.dispose();
  });
});
