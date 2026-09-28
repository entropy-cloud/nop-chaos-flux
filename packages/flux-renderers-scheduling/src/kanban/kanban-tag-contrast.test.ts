import { describe, expect, it } from 'vitest';
import { kanbanTagChipNeedsWhiteText } from './utils/kanban-tag-contrast.js';

// plan 2026-09-28-5 Phase 1: tag chips render on user-supplied colors — the
// text color must be the WCAG contrast pick, not a theme token.
describe('kanbanTagChipNeedsWhiteText', () => {
  it('picks white on dark backgrounds', () => {
    expect(kanbanTagChipNeedsWhiteText('#1f2937')).toBe(true);
    expect(kanbanTagChipNeedsWhiteText('#000000')).toBe(true);
  });

  it('picks black on light backgrounds', () => {
    expect(kanbanTagChipNeedsWhiteText('#f9fafb')).toBe(false);
    expect(kanbanTagChipNeedsWhiteText('#ffffff')).toBe(false);
  });

  it('expands 3-digit hex', () => {
    expect(kanbanTagChipNeedsWhiteText('#000')).toBe(true);
    expect(kanbanTagChipNeedsWhiteText('#fff')).toBe(false);
  });

  it('falls back to black on unparsable colors', () => {
    expect(kanbanTagChipNeedsWhiteText('red')).toBe(false);
    expect(kanbanTagChipNeedsWhiteText(undefined)).toBe(false);
    expect(kanbanTagChipNeedsWhiteText('')).toBe(false);
  });
});
