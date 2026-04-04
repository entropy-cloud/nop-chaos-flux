import { describe, it, expect } from 'vitest';
import type { ToolbarItem, ReportToolbarSchema } from './schemas.js';
import { defineReportDesignerPageSchema } from './types.js';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument } from '@nop-chaos/report-designer-core';

const doc = createReportTemplateDocument(createEmptyDocument());

describe('ToolbarItem', () => {
  it('should accept button item', () => {
    const item = {
      type: 'button',
      id: 'save',
      label: 'Save',
      icon: 'save',
      action: 'save',
      variant: 'primary',
    } satisfies ToolbarItem;

    expect(item.type).toBe('button');
    expect(item.label).toBe('Save');
  });

  it('should accept divider item', () => {
    const item = { type: 'divider' } satisfies ToolbarItem;
    expect(item.type).toBe('divider');
  });

  it('should accept spacer item', () => {
    const item = { type: 'spacer' } satisfies ToolbarItem;
    expect(item.type).toBe('spacer');
  });

  it('should accept text item', () => {
    const item = {
      type: 'text',
      text: 'Report Title',
    } satisfies ToolbarItem;

    expect(item.text).toBe('Report Title');
  });

  it('should accept badge item with expression-based disabled', () => {
    const item = {
      type: 'badge',
      label: 'Draft',
      disabled: '${!dirty}',
    } satisfies ToolbarItem;

    expect(item.type).toBe('badge');
    expect(item.disabled).toBe('${!dirty}');
  });

  it('should accept switch item', () => {
    const item = {
      type: 'switch',
      id: 'autoSave',
      label: 'Auto Save',
      active: true,
    } satisfies ToolbarItem;

    expect(item.type).toBe('switch');
    expect(item.active).toBe(true);
  });

  it('should accept title item with expression visibility', () => {
    const item = {
      type: 'title',
      body: 'My Report',
      visible: '${hasTitle}',
    } satisfies ToolbarItem;

    expect(item.type).toBe('title');
    expect(item.visible).toBe('${hasTitle}');
  });
});

describe('ReportToolbarSchema', () => {
  it('should have correct type discriminator', () => {
    const schema: ReportToolbarSchema = {
      type: 'report-toolbar',
      itemsOverride: [
        { type: 'button', label: 'Save', action: 'save' },
        { type: 'divider' },
        { type: 'button', label: 'Preview', action: 'preview' },
      ],
    };

    expect(schema.type).toBe('report-toolbar');
    expect(schema.itemsOverride).toHaveLength(3);
  });

  it('should allow schema without itemsOverride', () => {
    const schema: ReportToolbarSchema = {
      type: 'report-toolbar',
    };

    expect(schema.type).toBe('report-toolbar');
    expect(schema.itemsOverride).toBeUndefined();
  });
});

describe('defineReportDesignerPageSchema with toolbar', () => {
  it('should accept page schema with typed toolbar', () => {
    const schema = defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document: doc,
      designer: { kind: 'report-template' },
      toolbar: {
        type: 'report-toolbar',
        itemsOverride: [
          { type: 'button', label: 'Save', action: 'save', variant: 'primary' },
          { type: 'divider' },
          { type: 'button', label: 'Export', action: 'export' },
        ],
      },
    });

    expect(schema.type).toBe('report-designer-page');
    expect(schema.toolbar?.type).toBe('report-toolbar');
    expect(schema.toolbar?.itemsOverride).toHaveLength(3);
  });

  it('should accept page schema without toolbar', () => {
    const schema = defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document: doc,
      designer: { kind: 'report-template' },
    });

    expect(schema.toolbar).toBeUndefined();
  });
});
