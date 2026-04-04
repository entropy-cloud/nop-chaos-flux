import { describe, it, expect } from 'vitest';
import { DEFAULT_TOOLBAR_ITEMS } from './report-designer-toolbar-defaults.js';
import type { ToolbarItem } from './report-designer-toolbar-helpers.js';

const VALID_TYPES: ToolbarItem['type'][] = ['button', 'divider', 'spacer', 'text', 'badge', 'switch', 'title'];

describe('DEFAULT_TOOLBAR_ITEMS', () => {
  it('is non-empty', () => {
    expect(DEFAULT_TOOLBAR_ITEMS.length).toBeGreaterThan(0);
  });

  it('all items have valid type values', () => {
    for (const item of DEFAULT_TOOLBAR_ITEMS) {
      expect(VALID_TYPES).toContain(item.type);
    }
  });

  it('all items with an id have unique ids', () => {
    const ids = DEFAULT_TOOLBAR_ITEMS
      .map((item) => item.id)
      .filter((id): id is string => id != null);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all button-type items have an action', () => {
    const buttons = DEFAULT_TOOLBAR_ITEMS.filter((item) => item.type === 'button');
    for (const button of buttons) {
      expect(button.action).toBeDefined();
      expect(typeof button.action).toBe('string');
    }
  });

  it('has at least one undo button', () => {
    const hasUndo = DEFAULT_TOOLBAR_ITEMS.some(
      (item) => item.type === 'button' && item.action === 'report-designer:undo',
    );
    expect(hasUndo).toBe(true);
  });

  it('has at least one redo button', () => {
    const hasRedo = DEFAULT_TOOLBAR_ITEMS.some(
      (item) => item.type === 'button' && item.action === 'report-designer:redo',
    );
    expect(hasRedo).toBe(true);
  });

  it('has a save button', () => {
    const hasSave = DEFAULT_TOOLBAR_ITEMS.some(
      (item) => item.type === 'button' && item.action === 'report-designer:save',
    );
    expect(hasSave).toBe(true);
  });

  it('has a preview button', () => {
    const hasPreview = DEFAULT_TOOLBAR_ITEMS.some(
      (item) => item.type === 'button' && item.action === 'report-designer:preview',
    );
    expect(hasPreview).toBe(true);
  });

  it('has a title item', () => {
    const hasTitle = DEFAULT_TOOLBAR_ITEMS.some(
      (item) => item.type === 'title',
    );
    expect(hasTitle).toBe(true);
  });
});
