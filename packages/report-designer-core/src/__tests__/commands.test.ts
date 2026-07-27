import { describe, it, expect } from 'vitest';
import { isReportDesignerCommand } from '../index.js';

describe('isReportDesignerCommand', () => {
  it('returns true for valid DropFieldToTargetCommand', () => {
    const cmd = {
      type: 'report-designer:dropFieldToTarget',
      field: { id: 'f1', label: 'Field 1' },
      target: { kind: 'cell', sheetId: 's1', row: 0, col: 0 },
    };
    expect(isReportDesignerCommand(cmd)).toBe(true);
  });

  it('returns true for valid UpdateReportMetaCommand', () => {
    const cmd = {
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'Test' },
    };
    expect(isReportDesignerCommand(cmd)).toBe(true);
  });

  it('returns true for valid simple commands without extra properties', () => {
    const cmd = { type: 'report-designer:undo' };
    expect(isReportDesignerCommand(cmd)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isReportDesignerCommand(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isReportDesignerCommand(undefined)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isReportDesignerCommand('hello')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isReportDesignerCommand(42)).toBe(false);
  });

  it('returns false for boolean true', () => {
    expect(isReportDesignerCommand(true)).toBe(false);
  });

  it('returns false for boolean false', () => {
    expect(isReportDesignerCommand(false)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isReportDesignerCommand(['report-designer:undo'])).toBe(false);
  });

  it('returns false for object without type property', () => {
    expect(isReportDesignerCommand({ foo: 'bar' })).toBe(false);
  });

  it('returns false for object with null type', () => {
    expect(isReportDesignerCommand({ type: null })).toBe(false);
  });

  it('returns false for object with number type', () => {
    expect(isReportDesignerCommand({ type: 123 })).toBe(false);
  });

  it('returns false for object with type not starting with report-designer:', () => {
    expect(isReportDesignerCommand({ type: 'some-other:command' })).toBe(false);
  });

  it('returns false for object with empty type string', () => {
    expect(isReportDesignerCommand({ type: '' })).toBe(false);
  });

  it('returns false when type starts with report-designer: but has partial/typo prefix', () => {
    expect(isReportDesignerCommand({ type: 'report-designer' })).toBe(false);
  });

  it('returns true for object with type that is exactly the prefix colon (edge case)', () => {
    expect(isReportDesignerCommand({ type: 'report-designer:' })).toBe(true);
  });
});
