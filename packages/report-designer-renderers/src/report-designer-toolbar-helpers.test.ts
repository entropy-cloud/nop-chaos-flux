import { describe, it, expect } from 'vitest';
import {
  evalBooleanExpr,
  evalTextTemplate,
  toCommand,
  readState,
  mergeToolbarItems,
  type ToolbarItem,
} from './report-designer-toolbar-helpers.js';

describe('evalBooleanExpr', () => {
  const snapshot = { canUndo: true, canRedo: false };

  it('returns true for static true', () => {
    expect(evalBooleanExpr(true, {})).toBe(true);
  });

  it('returns false for static false', () => {
    expect(evalBooleanExpr(false, {})).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(evalBooleanExpr(undefined, {})).toBe(false);
  });

  it('treats bare string "true" as a state key lookup, not a boolean literal', () => {
    expect(evalBooleanExpr('true', {})).toBe(false);
  });

  it('returns true for ${true} when canUndo is true', () => {
    expect(evalBooleanExpr('${canUndo}', { canUndo: true })).toBe(true);
  });

  it('returns false for ${canRedo} when canRedo is false', () => {
    expect(evalBooleanExpr('${canRedo}', snapshot)).toBe(false);
  });

  it('handles negation with ! prefix', () => {
    expect(evalBooleanExpr('${!canUndo}', { canUndo: true })).toBe(false);
    expect(evalBooleanExpr('${!canRedo}', { canRedo: false })).toBe(true);
  });

  it('handles negation without ${} wrapper', () => {
    expect(evalBooleanExpr('!canUndo', { canUndo: true })).toBe(false);
    expect(evalBooleanExpr('!canRedo', { canRedo: false })).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(evalBooleanExpr('', {})).toBe(false);
  });

  it('returns false for null', () => {
    expect(evalBooleanExpr(null as unknown as string, {})).toBe(false);
  });

  it('returns false for numeric value', () => {
    expect(evalBooleanExpr(42 as unknown as string, {})).toBe(false);
  });

  it('strips ${} wrapper and evaluates', () => {
    expect(evalBooleanExpr('${canUndo}', { canUndo: true })).toBe(true);
  });

  it('evaluates without ${} wrapper', () => {
    expect(evalBooleanExpr('canUndo', { canUndo: true })).toBe(true);
  });
});

describe('evalTextTemplate', () => {
  it('returns empty string for undefined', () => {
    expect(evalTextTemplate(undefined, {})).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(evalTextTemplate('', {})).toBe('');
  });

  it('returns plain text as-is', () => {
    expect(evalTextTemplate('Hello World', {})).toBe('Hello World');
  });

  it('substitutes ${documentName} from snapshot', () => {
    expect(evalTextTemplate('${documentName}', { documentName: 'My Report' })).toBe('My Report');
  });

  it('reads documentName from designer.documentName', () => {
    expect(evalTextTemplate('${documentName}', { designer: { documentName: 'Report A' } })).toBe('Report A');
  });

  it('handles ternary pattern', () => {
    expect(evalTextTemplate("${isDirty ? 'Modified' : 'Saved'}", { isDirty: true })).toBe('Modified');
    expect(evalTextTemplate("${isDirty ? 'Modified' : 'Saved'}", { isDirty: false })).toBe('Saved');
  });

  it('handles mixed text with interpolation', () => {
    expect(evalTextTemplate('Hello ${name}!', { name: 'World' })).toBe('Hello World!');
  });

  it('handles multiple interpolations', () => {
    expect(evalTextTemplate('${a} and ${b}', { a: 'X', b: 'Y' })).toBe('X and Y');
  });

  it('replaces unknown state with empty string', () => {
    expect(evalTextTemplate('${unknown}', {})).toBe('');
  });

  it('handles ${fieldCount} fields pattern', () => {
    expect(evalTextTemplate('${fieldCount} fields', { designer: { fieldCount: 5 } })).toBe('5 fields');
  });
});

describe('toCommand', () => {
  it('maps report-designer:undo', () => {
    expect(toCommand('report-designer:undo')).toEqual({ type: 'report-designer:undo' });
  });

  it('maps report-designer:redo', () => {
    expect(toCommand('report-designer:redo')).toEqual({ type: 'report-designer:redo' });
  });

  it('maps report-designer:preview with inline mode', () => {
    expect(toCommand('report-designer:preview')).toEqual({ type: 'report-designer:preview', mode: 'inline' });
  });

  it('maps report-designer:stopPreview with undefined mode', () => {
    expect(toCommand('report-designer:stopPreview')).toEqual({ type: 'report-designer:preview', mode: undefined });
  });

  it('maps report-designer:save', () => {
    expect(toCommand('report-designer:save')).toEqual({ type: 'report-designer:save' });
  });

  it('maps report-designer:openInspector', () => {
    expect(toCommand('report-designer:openInspector')).toEqual({ type: 'report-designer:openInspector' });
  });

  it('maps report-designer:closeInspector', () => {
    expect(toCommand('report-designer:closeInspector')).toEqual({ type: 'report-designer:closeInspector' });
  });

  it('returns null for undefined', () => {
    expect(toCommand(undefined)).toBeNull();
  });

  it('returns null for unknown action', () => {
    expect(toCommand('unknown:action')).toBeNull();
  });
});

describe('readState', () => {
  it('reads canUndo from snapshot', () => {
    expect(readState('canUndo', { canUndo: true })).toBe(true);
  });

  it('reads canRedo from snapshot', () => {
    expect(readState('canRedo', { canRedo: true })).toBe(true);
  });

  it('reads isDirty from snapshot directly', () => {
    expect(readState('isDirty', { isDirty: true })).toBe(true);
  });

  it('reads isDirty from designer.dirty as fallback', () => {
    expect(readState('isDirty', { designer: { dirty: true } })).toBe(true);
  });

  it('prefers direct isDirty over designer.dirty', () => {
    expect(readState('isDirty', { isDirty: false, designer: { dirty: true } })).toBe(false);
  });

  it('reads hasSelection from designer.selectionTarget', () => {
    expect(readState('hasSelection', { designer: { selectionTarget: { kind: 'cell' } } })).toBe(true);
    expect(readState('hasSelection', { designer: { selectionTarget: undefined } })).toBe(false);
  });

  it('reads fieldCount from designer.fieldCount', () => {
    expect(readState('fieldCount', { designer: { fieldCount: 7 } })).toBe(7);
  });

  it('reads documentName from designer.documentName', () => {
    expect(readState('documentName', { designer: { documentName: 'Report.qry' } })).toBe('Report.qry');
  });

  it('reads documentName from document.name as fallback', () => {
    expect(readState('documentName', { document: { name: 'Fallback.qry' } })).toBe('Fallback.qry');
  });

  it('prefers designer.documentName over document.name', () => {
    expect(readState('documentName', { designer: { documentName: 'Primary' }, document: { name: 'Secondary' } })).toBe('Primary');
  });

  it('returns undefined for unknown state name', () => {
    expect(readState('unknownField', {})).toBeUndefined();
  });

  it('returns undefined for unknown state name with populated snapshot', () => {
    expect(readState('unknownField', { canUndo: true, canRedo: false })).toBeUndefined();
  });

  it('reads arbitrary keys from snapshot for unknown names', () => {
    expect(readState('customKey', { customKey: 'hello' })).toBe('hello');
  });
});

describe('mergeToolbarItems', () => {
  const defaults: ToolbarItem[] = [
    { id: 'undo', type: 'button', label: 'Undo', action: 'report-designer:undo' },
    { id: 'redo', type: 'button', label: 'Redo', action: 'report-designer:redo' },
    { id: 'save', type: 'button', label: 'Save', action: 'report-designer:save' },
  ];

  it('returns defaults as-is when no overrides', () => {
    const result = mergeToolbarItems(defaults, undefined);
    expect(result).toEqual(defaults);
    expect(result).not.toBe(defaults);
  });

  it('returns defaults as-is for empty overrides array', () => {
    const result = mergeToolbarItems(defaults, []);
    expect(result).toEqual(defaults);
    expect(result).not.toBe(defaults);
  });

  it('overrides matching item by id', () => {
    const overrides: ToolbarItem[] = [
      { id: 'undo', type: 'button', label: 'Undo (custom)', action: 'report-designer:undo' },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('Undo (custom)');
    expect(result[1].label).toBe('Redo');
    expect(result[2].label).toBe('Save');
  });

  it('removes default item when override has visible: false', () => {
    const overrides: ToolbarItem[] = [
      { id: 'redo', type: 'button', visible: false },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.id === 'redo')).toBeUndefined();
  });

  it('removes default item when override has visible: "false"', () => {
    const overrides: ToolbarItem[] = [
      { id: 'redo', type: 'button', visible: 'false' },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.id === 'redo')).toBeUndefined();
  });

  it('appends new override items without matching id', () => {
    const overrides: ToolbarItem[] = [
      { id: 'export', type: 'button', label: 'Export', action: 'report-designer:export' },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(4);
    expect(result[3].id).toBe('export');
    expect(result[3].label).toBe('Export');
  });

  it('does not append override with visible: false and no matching default', () => {
    const overrides: ToolbarItem[] = [
      { id: 'phantom', type: 'button', label: 'Phantom', visible: false },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(3);
    expect(result.find((item) => item.id === 'phantom')).toBeUndefined();
  });

  it('handles multiple mixed overrides', () => {
    const overrides: ToolbarItem[] = [
      { id: 'undo', type: 'button', label: 'Undo v2' },
      { id: 'save', type: 'button', visible: false },
      { id: 'export', type: 'button', label: 'Export' },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('Undo v2');
    expect(result[0].id).toBe('undo');
    expect(result.find((item) => item.id === 'save')).toBeUndefined();
    expect(result[2].id).toBe('export');
  });

  it('merges override props onto default (spread default, then override)', () => {
    const defaultsFull: ToolbarItem[] = [
      { id: 'undo', type: 'button', label: 'Undo', icon: 'undo', action: 'report-designer:undo', disabled: '${!canUndo}' },
    ];
    const overrides: ToolbarItem[] = [
      { id: 'undo', type: 'button', label: 'Undo Custom' },
    ];
    const result = mergeToolbarItems(defaultsFull, overrides);
    expect(result[0]).toEqual({
      id: 'undo',
      type: 'button',
      label: 'Undo Custom',
      icon: 'undo',
      action: 'report-designer:undo',
      disabled: '${!canUndo}',
    });
  });

  it('handles empty defaults with overrides', () => {
    const overrides: ToolbarItem[] = [
      { id: 'custom', type: 'button', label: 'Custom' },
    ];
    const result = mergeToolbarItems([], overrides);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('custom');
  });

  it('handles empty defaults and empty overrides', () => {
    const result = mergeToolbarItems([], []);
    expect(result).toEqual([]);
  });

  it('preserves items without id in defaults', () => {
    const defaultsMixed: ToolbarItem[] = [
      { type: 'divider' },
      { id: 'save', type: 'button', label: 'Save' },
    ];
    const result = mergeToolbarItems(defaultsMixed, []);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('divider');
  });

  it('ignores overrides without id', () => {
    const overrides: ToolbarItem[] = [
      { type: 'divider' },
    ];
    const result = mergeToolbarItems(defaults, overrides);
    expect(result).toHaveLength(3);
  });
});
